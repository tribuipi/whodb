# SQL Server Plugin Design

**Date:** 2026-06-05  
**Scope:** CE (community edition)  
**Auth:** Standard username/password against self-hosted SQL Server  
**Feature parity:** Full — schema browser, table CRUD, graph view, raw SQL queries, chat

## Approach

Use `gorm.io/driver/sqlserver` backed by `github.com/microsoft/go-mssqldb` (Microsoft's official driver). Extend `GormPlugin` with T-SQL-specific overrides. This is identical in structure to every other SQL plugin in the codebase.

## File Structure

```
core/src/plugins/sqlserver/
├── sqlserver.go    # Plugin struct, init(), T-SQL query overrides
├── db.go           # DB() method — DSN construction, GORM open
└── types.go        # Type definitions, alias map, supported operators
```

Touch points outside the plugin:

| File | Change |
|---|---|
| `core/src/engine/engine.go` | Add `DatabaseType_SQLServer = "SQLServer"` |
| `core/cmd/whodb/main.go` | Add blank import for sqlserver plugin |
| `core/src/dbcatalog/register.go` | Connection fields, port 1433, SSL modes |
| `core/src/sourcecatalog/specs/sqlserver.go` | Types, alias map, operators |
| `core/src/sourcecatalog/metadata.go` | Register session metadata |
| `frontend/src/icons.tsx` | Register SqlServer icon |
| `frontend/src/icons/SqlServerIcon.tsx` | SVG icon component |
| `core/go.mod` | Add `gorm.io/driver/sqlserver` + `github.com/microsoft/go-mssqldb` |

## Connection & Driver Config

DSN format: `sqlserver://user:password@host:port?database=dbname`

Connection fields (all required except port):
- Hostname, Username, Password, Database — required
- Port — default `1433`

SSL modes: `disable` / `require` / `verify-full`, mapped to `encrypt` and `TrustServerCertificate` driver URL params.

No Windows Auth, named instances, or Azure SQL in scope.

## T-SQL Method Overrides

| Method | Behavior |
|---|---|
| `GetPlaceholder(i int)` | Returns `@p1`, `@p2`, … |
| `GetAllSchemasQuery()` | `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA` |
| `GetSchemaTableQuery()` | `INFORMATION_SCHEMA.TABLES` filtered by schema |
| `GetTableInfoQuery()` | Join `INFORMATION_SCHEMA.COLUMNS` + `sys.tables` |
| `GetLastInsertID()` | `SELECT SCOPE_IDENTITY()` |
| `GetDatabases()` | `SELECT name FROM sys.databases WHERE state = 0` |
| `GetForeignKeyRelationships()` | `INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS` |
| `MarkGeneratedColumns()` | `sys.computed_columns` for identity/computed columns |

Pagination: GORM's sqlserver dialect automatically generates `OFFSET x ROWS FETCH NEXT y ROWS ONLY` — no manual override needed.

## Type System

Defined in `core/src/sourcecatalog/specs/sqlserver.go`.

**Core types:** `INT`, `BIGINT`, `SMALLINT`, `TINYINT`, `DECIMAL`, `FLOAT`, `REAL`, `BIT`, `VARCHAR`, `NVARCHAR`, `CHAR`, `NCHAR`, `TEXT`, `NTEXT`, `DATE`, `TIME`, `DATETIME2`, `DATETIMEOFFSET`, `UNIQUEIDENTIFIER`, `VARBINARY`, `JSON`, `XML`

**Alias map:**
- `INTEGER` → `INT`, `NUMERIC` → `DECIMAL`, `DOUBLE PRECISION` → `FLOAT`
- `DATETIME` → `DATETIME2`, `SMALLDATETIME` → `DATETIME2`
- `BOOLEAN` → `BIT`, `MONEY` → `DECIMAL`, `SMALLMONEY` → `DECIMAL`

**Operators:** `=`, `!=`, `<`, `>`, `<=`, `>=`, `LIKE`, `NOT LIKE`, `IS NULL`, `IS NOT NULL`, `IN`, `NOT IN`

## Catalog Registration

**dbcatalog:**
- Label: `"SQL Server"`
- All connection fields required; port defaults to `1433`
- SSL modes: `disable`, `require`, `verify-full`

**sourcecatalog:**
- Category: Database, Model: Relational
- Surfaces: Browser, Query, Chat, Graph
- Browse path: Database → Schema → Table
- Object types: Table, View

**engine aliases:** None (Azure SQL is out of scope for this pass).

## Testing

- `frontend/e2e/fixtures/databases/sqlserver.json` — E2E fixture pointing at Docker instance
- `dev/docker-compose.yml` — `mcr.microsoft.com/mssql/server:2022-latest` with seed data (test DB, schema, tables with FK relationships, sample rows)
- Build verification: `cd core && go build ./cmd/whodb && go vet ./...`
- Frontend verification: `cd frontend && pnpm run build:ce`
- Full Playwright E2E suite is out of scope for this pass; fixture file prepares for it.
