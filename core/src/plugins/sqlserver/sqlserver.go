/*
 * Copyright 2026 Clidey, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package sqlserver

import (
	"database/sql"
	"strconv"
	"strings"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"github.com/clidey/whodb/core/src/common"
	"github.com/clidey/whodb/core/src/engine"
	"github.com/clidey/whodb/core/src/log"
	"github.com/clidey/whodb/core/src/plugins"
	gorm_plugin "github.com/clidey/whodb/core/src/plugins/gorm"
	sourcecatalogspecs "github.com/clidey/whodb/core/src/sourcecatalog/specs"
)

var supportedOperators = sourcecatalogspecs.SQLServerSupportedOperators

// SQLServerPlugin implements GormPlugin for Microsoft SQL Server.
type SQLServerPlugin struct {
	gorm_plugin.GormPlugin
}

func (p *SQLServerPlugin) GetDatabases(config *engine.PluginConfig) ([]string, error) {
	return plugins.WithConnection(config, p.DB, func(db *gorm.DB) ([]string, error) {
		var results []struct {
			Name string `gorm:"column:name"`
		}
		if err := db.Raw("SELECT name FROM sys.databases WHERE state = 0 ORDER BY name").Scan(&results).Error; err != nil {
			return nil, err
		}
		names := make([]string, 0, len(results))
		for _, r := range results {
			names = append(names, r.Name)
		}
		return names, nil
	})
}

func (p *SQLServerPlugin) GetAllSchemasQuery() string {
	return "SELECT SCHEMA_NAME AS schemaname FROM INFORMATION_SCHEMA.SCHEMATA"
}

func (p *SQLServerPlugin) GetTableInfoQuery() string {
	return `
		SELECT
			t.TABLE_NAME,
			t.TABLE_TYPE,
			SUM(a.used_pages) * 8192 AS total_size,
			SUM(a.data_pages) * 8192 AS data_size
		FROM INFORMATION_SCHEMA.TABLES t
		LEFT JOIN sys.tables st ON st.name = t.TABLE_NAME
		LEFT JOIN sys.indexes i ON i.object_id = st.object_id
		LEFT JOIN sys.partitions p ON p.object_id = i.object_id AND p.index_id = i.index_id
		LEFT JOIN sys.allocation_units a ON a.container_id = p.partition_id
		WHERE t.TABLE_SCHEMA = ?
		GROUP BY t.TABLE_NAME, t.TABLE_TYPE`
}

func (p *SQLServerPlugin) GetStorageUnitExistsQuery() string {
	return `SELECT CASE WHEN EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?) THEN 1 ELSE 0 END`
}

func (p *SQLServerPlugin) GetPlaceholder(index int) string {
	return "@p" + strconv.Itoa(index)
}

func (p *SQLServerPlugin) GetTableNameAndAttributes(rows *sql.Rows) (string, []engine.Record) {
	var tableName, tableType string
	var totalSize, dataSize sql.NullInt64
	if err := rows.Scan(&tableName, &tableType, &totalSize, &dataSize); err != nil {
		log.WithError(err).Error("Failed to scan SQL Server table information")
		return "", []engine.Record{}
	}

	tableTypeNorm := tableType
	if strings.EqualFold(tableType, "BASE TABLE") {
		tableTypeNorm = "TABLE"
	}

	attributes := []engine.Record{
		{Key: "Type", Value: tableTypeNorm},
	}
	if totalSize.Valid {
		attributes = append(attributes, engine.Record{Key: "Total Size", Value: strconv.FormatInt(totalSize.Int64, 10)})
	}
	if dataSize.Valid {
		attributes = append(attributes, engine.Record{Key: "Data Size", Value: strconv.FormatInt(dataSize.Int64, 10)})
	}
	return tableName, attributes
}

func (p *SQLServerPlugin) GetLastInsertID(db *gorm.DB) (int64, error) {
	var id sql.NullInt64
	if err := db.Raw("SELECT SCOPE_IDENTITY()").Scan(&id).Error; err != nil {
		return 0, err
	}
	if !id.Valid {
		return 0, nil
	}
	return id.Int64, nil
}

func (p *SQLServerPlugin) GetSupportedOperators() map[string]string {
	return supportedOperators
}

func (p *SQLServerPlugin) GetPrimaryKeyColQuery() string {
	return `
		SELECT kcu.COLUMN_NAME
		FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
		JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
			ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
			AND tc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
		WHERE tc.TABLE_SCHEMA = ?
			AND tc.TABLE_NAME = ?
			AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'`
}

func (p *SQLServerPlugin) GetCreateTableQuery(db *gorm.DB, schema string, storageUnit string, columns []engine.Record) string {
	builder := gorm_plugin.NewSQLBuilder(db, p)

	columnDefs := gorm_plugin.RecordsToColumnDefs(columns, func(def gorm_plugin.ColumnDef, column engine.Record) gorm_plugin.ColumnDef {
		extra := engine.NormalizeCreationExtra(column.Extra)
		lowerType := strings.ToLower(column.Value)
		if extra["identity"] == "true" && (strings.Contains(lowerType, "int") || strings.Contains(lowerType, "bigint")) {
			def.Extra = "IDENTITY(1,1)"
			def.Primary = extra["primary"] == "true"
		} else {
			def.Primary = extra["primary"] == "true"
		}
		return def
	})

	return builder.CreateTableQuery(schema, storageUnit, columnDefs)
}

func (p *SQLServerPlugin) GetGraphQueryDB(db *gorm.DB, schema string) *gorm.DB {
	return db.Raw(`
		SELECT DISTINCT
			OBJECT_NAME(fk.referenced_object_id) AS Table1,
			OBJECT_NAME(fk.parent_object_id) AS Table2,
			'OneToMany' AS Relation,
			COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS SourceColumn,
			COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS TargetColumn
		FROM sys.foreign_keys fk
		JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
		WHERE SCHEMA_NAME(OBJECT_SCHEMA_ID(fk.parent_object_id)) = ?`, schema)
}

func (p *SQLServerPlugin) RawExecute(config *engine.PluginConfig, query string, params ...any) (*engine.GetRowsResult, error) {
	return p.ExecuteRawSQL(config, p.DB, query, params...)
}

func (p *SQLServerPlugin) GetForeignKeyRelationships(config *engine.PluginConfig, schema string, storageUnit string) (map[string]*engine.ForeignKeyRelationship, error) {
	query := `
		SELECT
			kcu.COLUMN_NAME,
			ccu.TABLE_NAME AS REFERENCED_TABLE_NAME,
			ccu.COLUMN_NAME AS REFERENCED_COLUMN_NAME
		FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
		JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
			ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
			AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
		JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE ccu
			ON ccu.CONSTRAINT_NAME = rc.UNIQUE_CONSTRAINT_NAME
			AND ccu.CONSTRAINT_SCHEMA = rc.UNIQUE_CONSTRAINT_SCHEMA
		WHERE kcu.TABLE_SCHEMA = ?
			AND kcu.TABLE_NAME = ?`
	return p.QueryForeignKeyRelationships(config, query, schema, storageUnit)
}

func (p *SQLServerPlugin) NormalizeType(typeName string) string {
	return common.NormalizeTypeWithMap(typeName, sourcecatalogspecs.SQLServerAliasMap)
}

func (p *SQLServerPlugin) MarkGeneratedColumns(config *engine.PluginConfig, schema string, storageUnit string, columns []engine.Column) error {
	computed, err := p.QueryComputedColumns(config, `
		SELECT c.name
		FROM sys.computed_columns cc
		JOIN sys.columns c ON cc.object_id = c.object_id AND cc.column_id = c.column_id
		JOIN sys.tables t ON t.object_id = cc.object_id
		JOIN sys.schemas s ON s.schema_id = t.schema_id
		WHERE s.name = ? AND t.name = ?
	`, schema, storageUnit)
	if err != nil {
		return err
	}

	for i := range columns {
		if computed[columns[i].Name] {
			columns[i].IsComputed = true
		}
	}
	return nil
}

// BuildSkipConflictClause returns the conflict-skip clause for SQL Server.
// GORM's sqlserver dialect translates DoNothing into a MERGE statement.
func (p *SQLServerPlugin) BuildSkipConflictClause(pkColumns []string) clause.OnConflict {
	conflictCols := make([]clause.Column, len(pkColumns))
	for i, col := range pkColumns {
		conflictCols[i] = clause.Column{Name: col}
	}
	return clause.OnConflict{
		Columns:   conflictCols,
		DoNothing: true,
	}
}

func init() {
	engine.RegisterPlugin(NewSQLServerPlugin())
}

// NewSQLServerPlugin constructs the SQL Server plugin and wires up the self-referential
// GormPluginFunctions pointer required by the GormPlugin base.
func NewSQLServerPlugin() *engine.Plugin {
	p := &SQLServerPlugin{}
	p.Type = engine.DatabaseType_SQLServer
	p.PluginFunctions = p
	p.GormPluginFunctions = p
	return &p.Plugin
}
