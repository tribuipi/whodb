# Server-Side Default Table Query Generation

**Date:** 2026-06-20  
**Branch:** feat/sql-editor-redesign  
**Status:** Approved

## Problem

When a user clicks a table in the SQL editor's object tree or opens the explore storage unit page, the frontend constructs a `SELECT * FROM table LIMIT n` query using hardcoded client-side templates:

- `raw-execute.tsx:37` — `SELECT * FROM ${qualified} LIMIT 100;`
- `explore-storage-unit.tsx:282` — `SELECT * FROM ${qualified} LIMIT 5`

Client-side identifier quoting (`quoteIdentifier()`) handles `"` vs `` ` `` correctly for current plugins, but the LIMIT syntax itself is wrong for SQL Server, which requires `SELECT TOP n * FROM [schema].[table]`. SQL Server is an existing plugin (`core/src/plugins/sqlserver/`).

## Goal

Move SELECT query generation to the server so each plugin produces the syntactically correct query for its dialect.

## Approach

Add `DefaultSelectQuery(schema, table string, limit int) string` to the `PluginFunctions` interface, following the same shape as `FormatValue(val any) string` — a config-free, dialect-static method that returns a computed string. Expose it via a new `DefaultTableQuery` GraphQL field. The frontend calls this instead of constructing the string locally.

## Design

### 1. GraphQL Schema

Add to `core/graph/schema.graphqls` in the Query type:

```graphql
DefaultTableQuery(ref: SourceObjectRefInput!, limit: Int!): String!
```

Returns the complete, ready-to-execute SELECT string for the active session's dialect. Returns `""` for non-SQL sources (MongoDB, Redis, Elasticsearch, Memcached).

### 2. `PluginFunctions` Interface

Add to `core/src/engine/plugin.go`:

```go
DefaultSelectQuery(schema, table string, limit int) string
```

No `*PluginConfig` needed — identifier quoting syntax is dialect-static, not connection-dependent.

### 3. Default GORM Implementation

Added to `GormPlugin` base struct (shared by Postgres, MySQL/MariaDB, SQLite3, ClickHouse, DuckDB):

```go
func (p *GormPlugin) DefaultSelectQuery(schema, table string, limit int) string {
    q := p.QuoteChar() // returns `"` or "`" per dialect
    quote := func(s string) string { return q + strings.ReplaceAll(s, q, q+q) + q }
    qualified := quote(table)
    if schema != "" {
        qualified = quote(schema) + "." + qualified
    }
    return fmt.Sprintf("SELECT * FROM %s LIMIT %d", qualified, limit)
}
```

`QuoteChar()` is a new helper on `GormPlugin` returning the static dialect quote character:
- Postgres, SQLite3, DuckDB → `"`
- MySQL, MariaDB, ClickHouse → `` ` ``

### 4. SQL Server Override

Added to `core/src/plugins/sqlserver/sqlserver.go`:

```go
func (p *SQLServerPlugin) DefaultSelectQuery(schema, table string, limit int) string {
    quote := func(s string) string { return "[" + strings.ReplaceAll(s, "]", "]]") + "]" }
    qualified := quote(table)
    if schema != "" {
        qualified = quote(schema) + "." + qualified
    }
    return fmt.Sprintf("SELECT TOP %d * FROM %s", limit, qualified)
}
```

### 5. Non-SQL Plugins

MongoDB, Redis, Elasticsearch, Memcached implement `DefaultSelectQuery` returning `""`. The frontend skips tab creation when the response is empty.

### 6. GraphQL Resolver

Added to `core/graph/schema.resolvers.go`:

```go
func (r *queryResolver) DefaultTableQuery(ctx context.Context, ref *model.SourceObjectRefInput, limit int) (string, error) {
    spec, _, err := getSourceSessionForContext(ctx)
    if err != nil {
        return "", err
    }
    plugin := engine.GetPlugin(spec.Type)
    if plugin == nil {
        return "", errors.New("unknown source type")
    }
    schema := sourceSchemaFromContext(ctx)
    return plugin.DefaultSelectQuery(schema, ref.Locator, limit), nil
}
```

### 7. Frontend — `raw-execute.tsx`

Replace `onSelectObject` callback (lines 32–39):

```typescript
const [fetchDefaultQuery] = useLazyQuery(DefaultTableQueryDocument);

onSelectObject={async obj => {
    const { data } = await fetchDefaultQuery({
        variables: { ref: obj.Ref, limit: 100 },
    });
    if (!data?.DefaultTableQuery) return;
    dispatch(SqlEditorActions.addSqlTab({
        name: obj.Name,
        code: data.DefaultTableQuery,
        autoRun: true,
    }));
}}
```

Remove the `quoteIdentifier` and `formatSql` imports if no longer used elsewhere in the file.

### 8. Frontend — `explore-storage-unit.tsx`

Replace `initialScratchpadQuery` useMemo (lines 278–283) with a `useQuery`:

```typescript
const { data: defaultQueryData } = useQuery(DefaultTableQueryDocument, {
    variables: { ref: currentUnitRef, limit: 5 },
    skip: !currentUnitRef,
});
const initialScratchpadQuery = defaultQueryData?.DefaultTableQuery ?? '';
```

`currentUnitRef` is already available in the component as `unit?.Ref` (line 256), the same ref used for `SourceRows` and other queries in this component.

The `scratchpadQueryWithConditions` WHERE-injection logic stays unchanged. For SQL Server (`SELECT TOP 5 * FROM [schema].[table]`), the `/\s+LIMIT\s+\d+/i` regex won't match, so the WHERE clause is appended after the table reference — valid T-SQL.

## Files Changed

| File | Change |
|------|--------|
| `core/graph/schema.graphqls` | Add `DefaultTableQuery` query field |
| `core/graph/schema.resolvers.go` | Add `DefaultTableQuery` resolver |
| `core/src/engine/plugin.go` | Add `DefaultSelectQuery` to `PluginFunctions` interface |
| `core/src/plugins/gorm/plugin.go` | Add `QuoteChar()` helper + default `DefaultSelectQuery` on `GormPlugin` |
| `core/src/plugins/sqlserver/sqlserver.go` | Override `DefaultSelectQuery` with `SELECT TOP n` syntax |
| `core/src/plugins/postgres/`, `mysql/`, `sqlite3/`, `clickhouse/`, `duckdb/` | No changes needed — `DefaultSelectQuery` is satisfied via `GormPlugin` embedding |
| `core/src/plugins/mongodb/mongodb.go` | Implement `DefaultSelectQuery` returning `""` |
| `core/src/plugins/redis/redis.go` | Implement `DefaultSelectQuery` returning `""` |
| `core/src/plugins/elasticsearch/elasticsearch.go` | Implement `DefaultSelectQuery` returning `""` |
| `core/src/plugins/memcached/memcached.go` | Implement `DefaultSelectQuery` returning `""` |
| `frontend/src/pages/raw-execute/raw-execute.tsx` | Call `DefaultTableQuery` GQL instead of building string locally |
| `frontend/src/pages/storage-unit/explore-storage-unit.tsx` | Call `DefaultTableQuery` GQL instead of useMemo |
| `frontend/src/generated/` | Re-run GraphQL codegen |

## Verification

- `go build ./cmd/whodb` — all plugins satisfy the updated interface
- `pnpm run build:ce` — frontend compiles with new generated types
- Manual: click a table in SQL Server → query uses `SELECT TOP 100 * FROM [schema].[table]`
- Manual: click a table in Postgres → query uses `SELECT * FROM "schema"."table" LIMIT 100`
