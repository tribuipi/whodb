# SQL Server Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a CE SQL Server database plugin with full parity: schema browser, table CRUD, graph view, raw SQL queries, and chat.

**Architecture:** Extend `GormPlugin` using `gorm.io/driver/sqlserver` backed by `github.com/microsoft/go-mssqldb`. The plugin lives in `core/src/plugins/sqlserver/` and follows the same structure as MySQL — three files (sqlserver.go, db.go, types.go) plus touch points in engine, catalog, and frontend.

**Tech Stack:** Go, GORM, gorm.io/driver/sqlserver v1, github.com/microsoft/go-mssqldb, React/TSX (icon only)

---

## Reference files to read before starting

Before writing any code, read these files to understand patterns used throughout:

- `core/src/plugins/mysql/mysql.go` — primary reference for method signatures
- `core/src/plugins/mysql/db.go` — DB() construction pattern
- `core/src/plugins/mysql/graph.go` — GetGraphQueryDB() pattern
- `core/src/sourcecatalog/specs/sql.go` — where to add SQL Server type specs (add to this file, don't create a new one)
- `core/src/sourcecatalog/metadata.go` — where to register session metadata
- `core/src/sourcecatalog/catalog.go` — where to add family spec and sqlserverTraits()
- `core/src/dbcatalog/catalog.go` — where to add ConnectableDatabase entry
- `core/src/dbcatalog/ssl_modes.go` — where to add SQL Server SSL case
- `core/src/engine/engine.go` — where to add DatabaseType_SQLServer constant
- `core/cmd/whodb/main.go` — where to add blank import
- `frontend/src/components/icons.tsx` lines 16–71 — the ceLogos object where icons live

---

## Task 1: Add Go module dependencies

**Files:**
- Modify: `core/go.mod`
- Modify: `core/go.sum` (auto-updated by go get)

- [ ] **Step 1: Add the GORM sqlserver driver and the Microsoft MSSQL driver**

```bash
cd core
go get gorm.io/driver/sqlserver@latest
go get github.com/microsoft/go-mssqldb@latest
```

- [ ] **Step 2: Verify the modules appear in go.mod**

```bash
grep "sqlserver\|go-mssqldb" core/go.mod
```

Expected: two lines — `gorm.io/driver/sqlserver vX.Y.Z` and `github.com/microsoft/go-mssqldb vX.Y.Z`

- [ ] **Step 3: Commit**

```bash
git add core/go.mod core/go.sum
git commit -m "chore: add gorm sqlserver driver and microsoft/go-mssqldb"
```

---

## Task 2: Add DatabaseType_SQLServer constant

**Files:**
- Modify: `core/src/engine/engine.go` — add constant after existing `DatabaseType_TiDB` line

- [ ] **Step 1: Add the constant**

In `core/src/engine/engine.go`, in the `const` block, add after `DatabaseType_TiDB`:

```go
DatabaseType_SQLServer = "SQLServer"
```

The block should look like:
```go
const (
    // ... existing constants ...
    DatabaseType_TiDB          = "TiDB"
    DatabaseType_SQLServer     = "SQLServer"
    // ... rest of file ...
)
```

- [ ] **Step 2: Verify build**

```bash
cd core && go build ./...
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add core/src/engine/engine.go
git commit -m "feat(engine): add DatabaseType_SQLServer constant"
```

---

## Task 3: Add SQL Server type specs

**Files:**
- Modify: `core/src/sourcecatalog/specs/sql.go` — add at the end of the file

- [ ] **Step 1: Add SQL Server operators, alias map, and type definitions at the end of `core/src/sourcecatalog/specs/sql.go`**

```go
var SQLServerSupportedOperators = map[string]string{
	"=": "=", ">=": ">=", ">": ">", "<=": "<=", "<": "<", "<>": "<>",
	"!=": "!=", opBetween: opBetween, opNotBetween: opNotBetween,
	opLike: opLike, opNotLike: opNotLike, "IN": "IN", opNotIn: opNotIn,
	opIsNull: opIsNull, opIsNotNull: opIsNotNull, "AND": "AND", "OR": "OR", "NOT": "NOT",
}

var SQLServerAliasMap = map[string]string{
	"INTEGER":          "INT",
	"NUMERIC":          "DECIMAL",
	"DOUBLE PRECISION": "FLOAT",
	"DATETIME":         "DATETIME2",
	"SMALLDATETIME":    "DATETIME2",
	"BOOLEAN":          "BIT",
	"MONEY":            "DECIMAL",
	"SMALLMONEY":       "DECIMAL",
}

var SQLServerTypeDefinitions = []engine.TypeDefinition{
	{ID: "TINYINT", Label: "TINYINT", Category: engine.TypeCategoryNumeric},
	{ID: typeSmallint, Label: typeSmallint, Category: engine.TypeCategoryNumeric},
	{ID: "INT", Label: "INT", Category: engine.TypeCategoryNumeric},
	{ID: typeBigint, Label: typeBigint, Category: engine.TypeCategoryNumeric},
	{ID: typeDecimal, Label: typeDecimal, HasPrecision: true, DefaultPrecision: new(10), Category: engine.TypeCategoryNumeric},
	{ID: "FLOAT", Label: "FLOAT", Category: engine.TypeCategoryNumeric},
	{ID: "REAL", Label: "REAL", Category: engine.TypeCategoryNumeric},
	{ID: typeVarchar, Label: typeVarchar, HasLength: true, DefaultLength: new(255), Category: engine.TypeCategoryText},
	{ID: "NVARCHAR", Label: "NVARCHAR", HasLength: true, DefaultLength: new(255), Category: engine.TypeCategoryText},
	{ID: "CHAR", Label: "CHAR", HasLength: true, DefaultLength: new(1), Category: engine.TypeCategoryText},
	{ID: "NCHAR", Label: "NCHAR", HasLength: true, DefaultLength: new(1), Category: engine.TypeCategoryText},
	{ID: typeText, Label: typeText, Category: engine.TypeCategoryText},
	{ID: "NTEXT", Label: "NTEXT", Category: engine.TypeCategoryText},
	{ID: "DATE", Label: "DATE", Category: engine.TypeCategoryDatetime},
	{ID: "TIME", Label: "TIME", Category: engine.TypeCategoryDatetime},
	{ID: "DATETIME2", Label: "DATETIME2", Category: engine.TypeCategoryDatetime},
	{ID: "DATETIMEOFFSET", Label: "DATETIMEOFFSET", Category: engine.TypeCategoryDatetime},
	{ID: "BIT", Label: "BIT", Category: engine.TypeCategoryBoolean},
	{ID: "VARBINARY", Label: "VARBINARY", HasLength: true, DefaultLength: new(255), Category: engine.TypeCategoryBinary},
	{ID: "UNIQUEIDENTIFIER", Label: "UNIQUEIDENTIFIER", Category: engine.TypeCategoryOther},
	{ID: "JSON", Label: "JSON", Category: engine.TypeCategoryJSON},
	{ID: "XML", Label: "XML", Category: engine.TypeCategoryOther},
}
```

- [ ] **Step 2: Verify build**

```bash
cd core && go build ./...
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add core/src/sourcecatalog/specs/sql.go
git commit -m "feat(specs): add SQL Server type definitions, alias map, and operators"
```

---

## Task 4: Create the plugin package — sqlserver.go

**Files:**
- Create: `core/src/plugins/sqlserver/sqlserver.go`

This file contains the plugin struct, `init()`, and all T-SQL query overrides.

- [ ] **Step 1: Create `core/src/plugins/sqlserver/sqlserver.go`**

```go
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
```

- [ ] **Step 2: Commit (don't verify build yet — db.go is missing)**

```bash
git add core/src/plugins/sqlserver/sqlserver.go
git commit -m "feat(sqlserver): add plugin struct and T-SQL method overrides"
```

---

## Task 5: Create db.go — connection construction

**Files:**
- Create: `core/src/plugins/sqlserver/db.go`

- [ ] **Step 1: Create `core/src/plugins/sqlserver/db.go`**

```go
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
	"fmt"
	"net"
	"net/url"
	"strconv"

	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/clidey/whodb/core/src/common/ssl"
	"github.com/clidey/whodb/core/src/engine"
	"github.com/clidey/whodb/core/src/log"
	"github.com/clidey/whodb/core/src/plugins"
)

// DB opens a GORM connection to SQL Server using the provided plugin config.
func (p *SQLServerPlugin) DB(config *engine.PluginConfig) (*gorm.DB, error) {
	connectionInput, err := p.ParseConnectionConfig(config)
	if err != nil {
		return nil, err
	}

	query := url.Values{}
	query.Set("database", connectionInput.Database)

	// Map SSL mode to SQL Server driver parameters.
	// SQL Server uses "encrypt" and "TrustServerCertificate" URL params.
	if connectionInput.SSLConfig == nil || !connectionInput.SSLConfig.IsEnabled() {
		query.Set("encrypt", "disable")
	} else {
		switch connectionInput.SSLConfig.Mode {
		case ssl.SSLModeRequired:
			query.Set("encrypt", "true")
			query.Set("TrustServerCertificate", "true")
		case ssl.SSLModeVerifyIdentity, ssl.SSLModeVerifyCA:
			query.Set("encrypt", "true")
			query.Set("TrustServerCertificate", "false")
		default:
			query.Set("encrypt", "disable")
		}
	}

	u := &url.URL{
		Scheme:   "sqlserver",
		User:     url.UserPassword(connectionInput.Username, connectionInput.Password),
		Host:     net.JoinHostPort(connectionInput.Hostname, strconv.Itoa(connectionInput.Port)),
		RawQuery: query.Encode(),
	}
	dsn := u.String()

	l := log.WithFields(map[string]any{
		"hostname": connectionInput.Hostname,
		"port":     connectionInput.Port,
		"database": connectionInput.Database,
		"username": connectionInput.Username,
	})

	db, err := gorm.Open(sqlserver.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(plugins.GetGormLogConfig())})
	if err != nil {
		l.WithError(err).Error("Failed to connect to SQL Server database")
		return nil, fmt.Errorf("sqlserver: %w", err)
	}

	if err := plugins.ConfigureConnectionPool(db); err != nil {
		l.WithError(err).Warn("Failed to configure connection pool")
	}

	return db, nil
}
```

- [ ] **Step 2: Verify the package builds**

```bash
cd core && go build ./src/plugins/sqlserver/...
```

Expected: no errors

- [ ] **Step 3: Verify the whole backend builds**

```bash
cd core && go build ./cmd/whodb
```

This will fail because main.go doesn't import the package yet — that's expected. The plugin package itself must compile cleanly, so check the output is only a "no Go files" or linker issue, not a compilation error in sqlserver/.

Actually — `go build ./src/plugins/sqlserver/...` is sufficient. Only run `go build ./cmd/whodb` after Task 7 (blank import).

- [ ] **Step 4: Commit**

```bash
git add core/src/plugins/sqlserver/db.go
git commit -m "feat(sqlserver): add DB() connection constructor"
```

---

## Task 6: Register in catalogs

**Files:**
- Modify: `core/src/dbcatalog/ssl_modes.go` — add SQL Server case
- Modify: `core/src/dbcatalog/catalog.go` — add ConnectableDatabase entry
- Modify: `core/src/sourcecatalog/catalog.go` — add connector constant, sqlserverTraits(), family spec entry
- Modify: `core/src/sourcecatalog/metadata.go` — register session metadata

### 6a: SSL modes

- [ ] **Step 1: Add SQL Server to `sslModesFor()` in `core/src/dbcatalog/ssl_modes.go`**

In the `switch dbType` block, add a case for SQL Server alongside Postgres (it uses the same three modes: disable / require / verify-full):

```go
case engine.DatabaseType_Postgres, engine.DatabaseType_CockroachDB, engine.DatabaseType_QuestDB, engine.DatabaseType_YugabyteDB, engine.DatabaseType_SQLServer:
    return cloneSSLModes(sslModesStandard("disable", "require", "verify-full"))
```

### 6b: Connectable database entry

- [ ] **Step 2: Add SQL Server entry to the `catalog` slice in `core/src/dbcatalog/catalog.go`**

Add after the existing entries (e.g., after the ClickHouse or DuckDB entry, keeping alphabetical or logical grouping):

```go
{
    ID:         engine.DatabaseType_SQLServer,
    Label:      "SQL Server",
    PluginType: engine.DatabaseType_SQLServer,
    Extra:      map[string]source.ConnectionExtraField{"Port": {DefaultValue: "1433"}},
    Fields: FieldVisibility{
        Hostname: true,
        Username: true,
        Password: true,
        Database: true,
    },
    RequiredFields: FieldRequirements{Hostname: true, Username: true, Password: true, Database: true},
    SSLModes:       sslModesFor(engine.DatabaseType_SQLServer),
},
```

### 6c: Source catalog family spec

- [ ] **Step 3: Add the connector constant in `core/src/sourcecatalog/catalog.go`**

In the `const` block near line 55:
```go
connectorSQLServer = "SQLServer"
```

- [ ] **Step 4: Add `sqlserverTraits()` helper in `core/src/sourcecatalog/catalog.go`** (after `mysqlTraits()`, around line 890):

```go
func sqlserverTraits() source.TypeTraits {
    return withHiddenObjectRules(
        networkTraits(source.HostInputModeHostname, source.HostInputURLParserNone),
        map[source.ObjectKind][]string{
            source.ObjectKindSchema: {"sys", "INFORMATION_SCHEMA", "guest"},
        },
        nil,
    )
}
```

- [ ] **Step 5: Add the family spec entry in `familySpecs` map in `core/src/sourcecatalog/catalog.go`**

Add after the `connectorYugabyteDB` entry or in the logical relational group:

```go
connectorSQLServer: {
    Category:       source.CategoryDatabase,
    Traits:         withExecutionTraits(sqlserverTraits(), true, true),
    Model:          source.ModelRelational,
    Surfaces:       []source.Surface{source.SurfaceBrowser, source.SurfaceQuery, source.SurfaceChat, source.SurfaceGraph},
    BrowsePath:     []source.ObjectKind{objectKindDatabase, objectKindSchema, objectKindTable},
    DefaultObject:  objectKindTable,
    GraphScopeKind: new(objectKindSchema),
    ObjectTypes: []source.ObjectType{
        metadataObjectType(objectKindDatabase, "Database", "Databases", true),
        metadataObjectType(objectKindSchema, "Schema", "Schemas", true),
        tabularObjectType(objectKindTable, "Table", "Tables"),
        tabularReadOnlyObjectType(objectKindView, "View", "Views"),
    },
},
```

### 6d: Session metadata

- [ ] **Step 6: Register SQL Server session metadata in `core/src/sourcecatalog/metadata.go`**

In the `registerSessionMetadata()` function, add after the DuckDB registration:

```go
RegisterSessionMetadata(
    string(engine.DatabaseType_SQLServer),
    SessionMetadataFromOperatorMap(specs.SQLServerTypeDefinitions, specs.SQLServerSupportedOperators, specs.SQLServerAliasMap),
)
```

- [ ] **Step 7: Verify build**

```bash
cd core && go build ./...
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add core/src/dbcatalog/ssl_modes.go \
        core/src/dbcatalog/catalog.go \
        core/src/sourcecatalog/catalog.go \
        core/src/sourcecatalog/metadata.go
git commit -m "feat(catalog): register SQL Server in db and source catalogs"
```

---

## Task 7: Add blank import to main.go

**Files:**
- Modify: `core/cmd/whodb/main.go`

- [ ] **Step 1: Add blank import**

In `core/cmd/whodb/main.go`, add to the CE plugins block in alphabetical order:

```go
_ "github.com/clidey/whodb/core/src/plugins/sqlserver"
```

The block should look like:
```go
// CE plugins — each registers itself via init()
_ "github.com/clidey/whodb/core/src/plugins/clickhouse"
_ "github.com/clidey/whodb/core/src/plugins/elasticsearch"
_ "github.com/clidey/whodb/core/src/plugins/memcached"
_ "github.com/clidey/whodb/core/src/plugins/mongodb"
_ "github.com/clidey/whodb/core/src/plugins/mysql"
_ "github.com/clidey/whodb/core/src/plugins/postgres"
_ "github.com/clidey/whodb/core/src/plugins/redis"
_ "github.com/clidey/whodb/core/src/plugins/sqlite3"
_ "github.com/clidey/whodb/core/src/plugins/sqlserver"
```

- [ ] **Step 2: Build the full binary**

```bash
cd core && go build ./cmd/whodb
```

Expected: binary builds cleanly with no errors

- [ ] **Step 3: Run go vet**

```bash
cd core && go vet ./...
```

Expected: no issues

- [ ] **Step 4: Commit**

```bash
git add core/cmd/whodb/main.go
git commit -m "feat(main): register SQL Server plugin"
```

---

## Task 8: Add frontend icon

**Files:**
- Modify: `frontend/src/components/icons.tsx` — add `SQLServer` key to `ceLogos`

- [ ] **Step 1: Add the SQL Server icon SVG to the `ceLogos` object in `frontend/src/components/icons.tsx`**

In the `ceLogos` object (starting around line 16), add a `SQLServer` entry. Use this official-style SQL Server SVG logo:

```tsx
SQLServer: <svg className="w-6 h-6" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
  <rect width="60" height="60" rx="6" fill="#CC2927"/>
  <text x="30" y="22" textAnchor="middle" fill="white" fontSize="9" fontFamily="Arial,sans-serif" fontWeight="bold">SQL</text>
  <text x="30" y="34" textAnchor="middle" fill="white" fontSize="7" fontFamily="Arial,sans-serif">Server</text>
  <ellipse cx="30" cy="46" rx="16" ry="5" fill="none" stroke="white" strokeWidth="1.5"/>
  <line x1="14" y1="46" x2="14" y2="50" stroke="white" strokeWidth="1.5"/>
  <line x1="46" y1="46" x2="46" y2="50" stroke="white" strokeWidth="1.5"/>
  <ellipse cx="30" cy="50" rx="16" ry="5" fill="none" stroke="white" strokeWidth="1.5"/>
</svg>,
```

Add it inside the `ceLogos = {` block, after the last existing entry and before the closing `}`.

- [ ] **Step 2: Verify frontend build**

```bash
cd frontend && pnpm run build:ce
```

Expected: no TypeScript errors, build succeeds

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/icons.tsx
git commit -m "feat(frontend): add SQL Server icon"
```

---

## Task 9: Docker service and E2E fixture

**Files:**
- Modify: `dev/docker-compose.yml` — add sqlserver service
- Create: `frontend/e2e/fixtures/databases/sqlserver.json` — E2E connection fixture

- [ ] **Step 1: Add SQL Server service to `dev/docker-compose.yml`**

Check the existing docker-compose for the pattern used by mysql or postgres. Add a sqlserver service using the official Microsoft image:

```yaml
sqlserver:
  image: mcr.microsoft.com/mssql/server:2022-latest
  environment:
    ACCEPT_EULA: "Y"
    SA_PASSWORD: "WhoDB_Test123!"
    MSSQL_PID: "Developer"
  ports:
    - "1433:1433"
  healthcheck:
    test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "WhoDB_Test123!" -C -Q "SELECT 1" || exit 1
    interval: 10s
    timeout: 5s
    retries: 10
    start_period: 30s
```

- [ ] **Step 2: Create `frontend/e2e/fixtures/databases/sqlserver.json`**

Check an existing fixture file (e.g. `frontend/e2e/fixtures/databases/postgres.json`) for the exact JSON structure, then create:

```json
{
  "type": "SQLServer",
  "credentials": {
    "hostname": "localhost",
    "username": "sa",
    "password": "WhoDB_Test123!",
    "database": "master",
    "advanced": [
      { "key": "Port", "value": "1433" }
    ]
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add dev/docker-compose.yml frontend/e2e/fixtures/databases/sqlserver.json
git commit -m "chore(dev): add SQL Server Docker service and E2E fixture"
```

---

## Task 10: Final verification

- [ ] **Step 1: Full backend build and vet**

```bash
cd core && go build ./cmd/whodb && go vet ./...
```

Expected: clean exit

- [ ] **Step 2: Full frontend build**

```bash
cd frontend && pnpm run build:ce
```

Expected: clean exit

- [ ] **Step 3: Confirm SQL Server appears in the plugin list at startup**

```bash
cd core && go run ./cmd/whodb 2>&1 | grep -i "sqlserver\|sql server\|registered" | head -5
```

If the server doesn't log plugin registration, just confirm it starts without panic.

- [ ] **Step 4: Final commit (if any leftover changes)**

```bash
git status
# commit any remaining changes
```

---

## Notes for implementer

- **`GetStorageUnitExistsQuery`**: SQL Server doesn't return a raw boolean from `EXISTS`. The query uses `CASE WHEN EXISTS(...) THEN 1 ELSE 0 END`. GORM's sqlserver driver converts integer `1`/`0` to Go `bool` via `Scan` — this works correctly. No override needed.

- **`GetGraphQueryDB` query**: The JOIN through `sys.foreign_keys` + `sys.foreign_key_columns` + `sys.columns` is the most reliable approach in SQL Server. Test it with actual FK relationships in the Docker container.

- **`BuildSkipConflictClause`**: GORM's sqlserver driver should translate `DoNothing: true` to a MERGE statement. If it generates invalid SQL, override with a MERGE-based implementation or simply do nothing and let conflicts fail (acceptable for mock data generation in the short term).

- **Icon**: The inline SVG above is a simple placeholder with correct SQL Server branding (red background, white text, cylinder shape). If the project ever gets an official SVG from Microsoft, replace it.

- **Localization**: The SQL Server plugin adds no user-facing strings beyond what's registered in the catalog. The `Label: "SQL Server"` in dbcatalog is a proper noun and follows the pattern of all other connectors.
