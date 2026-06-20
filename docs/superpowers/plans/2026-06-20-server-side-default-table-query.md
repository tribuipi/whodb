# Server-Side Default Table Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `SELECT * FROM table LIMIT n` query generation from client-side hardcoded templates to server-side plugin methods so each dialect (notably SQL Server) produces syntactically correct SQL.

**Architecture:** Add `DefaultSelectQuery(schema, table string, limit int) string` to the `PluginFunctions` interface. `GormPlugin` provides a default using its static quote character; `SQLServerPlugin` overrides with `SELECT TOP n` syntax. A new `DefaultTableQuery` GraphQL field calls this method, and both frontend call sites replace their hardcoded templates with this query.

**Tech Stack:** Go 1.23, gqlgen (GraphQL), React 18, Apollo Client, Redux Toolkit, TypeScript

## Global Constraints

- No SQL injection: never use `fmt.Sprintf` with raw user input for SQL — all table/schema names in this feature come from server-side metadata, not user text fields, so `fmt.Sprintf` is safe here
- No `switch dbType` / `if dbType ==` in shared code — the plugin interface method is the correct extension point
- All exported Go functions need doc comments
- Frontend: run `pnpm generate` after any `.graphql` file change before editing `.tsx` files
- Backend: run `cd core && go build ./cmd/whodb` after backend changes to verify all plugins satisfy the interface
- The auto-format hook runs `goimports` + `gofmt` after every file edit — import blocks will be fixed automatically

---

## File Map

| File | Role |
|------|------|
| `core/src/engine/plugin.go` | Add `DefaultSelectQuery` to `PluginFunctions` interface |
| `core/src/plugins/gorm/plugin.go` | Add `QuoteChar()` helper + `DefaultSelectQuery` default on `GormPlugin` |
| `core/src/plugins/sqlserver/sqlserver.go` | Override `DefaultSelectQuery` with `SELECT TOP n` syntax |
| `core/src/plugins/mongodb/mongodb.go` | Stub `DefaultSelectQuery` returning `""` |
| `core/src/plugins/redis/redis.go` | Stub `DefaultSelectQuery` returning `""` |
| `core/src/plugins/elasticsearch/elasticsearch.go` | Stub `DefaultSelectQuery` returning `""` |
| `core/src/plugins/memcached/memcached.go` | Stub `DefaultSelectQuery` returning `""` |
| `core/graph/schema.graphqls` | Add `DefaultTableQuery` field |
| `core/graph/schema.resolvers.go` | Implement `DefaultTableQuery` resolver |
| `frontend/src/pages/raw-execute/default-table-query.graphql` | New GraphQL query document |
| `frontend/src/pages/raw-execute/raw-execute.tsx` | Replace hardcoded template with lazy GQL call |
| `frontend/src/pages/storage-unit/explore-storage-unit.tsx` | Replace `initialScratchpadQuery` useMemo with GQL query |

---

### Task 1: Backend — Plugin interface + all implementations

**Files:**
- Modify: `core/src/engine/plugin.go`
- Modify: `core/src/plugins/gorm/plugin.go`
- Modify: `core/src/plugins/sqlserver/sqlserver.go`
- Modify: `core/src/plugins/mongodb/mongodb.go`
- Modify: `core/src/plugins/redis/redis.go`
- Modify: `core/src/plugins/elasticsearch/elasticsearch.go`
- Modify: `core/src/plugins/memcached/memcached.go`

**Interfaces:**
- Produces: `DefaultSelectQuery(schema, table string, limit int) string` on all plugins

- [ ] **Step 1: Add `DefaultSelectQuery` to `PluginFunctions` interface**

In `core/src/engine/plugin.go`, add this line to the `PluginFunctions` interface (after the existing `FormatValue` line at line 86, before `GetColumnsForTable`):

```go
// DefaultSelectQuery returns a dialect-correct SELECT query string for the given table.
// schema may be empty for databases that do not use schemas.
DefaultSelectQuery(schema, table string, limit int) string
```

The interface block in `plugin.go` should now contain that line among the others. Do not change any surrounding lines.

- [ ] **Step 2: Add `QuoteChar()` to `GormPlugin`**

In `core/src/plugins/gorm/plugin.go`, add this method after `GetDatabaseType()` (around line 583):

```go
// QuoteChar returns the identifier quote character for this dialect.
func (p *GormPlugin) QuoteChar() string {
	switch p.Type {
	case engine.DatabaseType_MySQL, engine.DatabaseType_MariaDB,
		engine.DatabaseType_ClickHouse, engine.DatabaseType_TiDB,
		engine.DatabaseType_StarRocks:
		return "`"
	default:
		return `"`
	}
}
```

- [ ] **Step 3: Add `DefaultSelectQuery` to `GormPlugin`**

In `core/src/plugins/gorm/plugin.go`, add this method immediately after `QuoteChar()`:

```go
// DefaultSelectQuery returns a dialect-correct SELECT ... LIMIT query.
func (p *GormPlugin) DefaultSelectQuery(schema, table string, limit int) string {
	q := p.QuoteChar()
	quote := func(s string) string { return q + strings.ReplaceAll(s, q, q+q) + q }
	qualified := quote(table)
	if schema != "" {
		qualified = quote(schema) + "." + qualified
	}
	return fmt.Sprintf("SELECT * FROM %s LIMIT %d", qualified, limit)
}
```

`strings` and `fmt` are already imported in `gorm/plugin.go`.

- [ ] **Step 4: Build to verify GORM-embedded plugins compile**

Run from the repo root:
```bash
cd core && go build ./cmd/whodb
```

Expected: build succeeds. If it fails with "missing DefaultSelectQuery" on a GORM-embedded plugin (postgres, mysql, sqlite3, clickhouse, duckdb), those plugins embed `GormPlugin` which now provides it — check that the plugin struct still embeds `GormPlugin` (e.g., `type PostgresPlugin struct { gorm_plugin.GormPlugin; ... }`).

- [ ] **Step 5: Override `DefaultSelectQuery` on `SQLServerPlugin`**

In `core/src/plugins/sqlserver/sqlserver.go`, add this method after `GetDatabases` (line ~50). SQL Server uses `SELECT TOP n * FROM [schema].[table]` and square-bracket quoting:

```go
// DefaultSelectQuery returns a T-SQL SELECT TOP query for SQL Server.
func (p *SQLServerPlugin) DefaultSelectQuery(schema, table string, limit int) string {
	quote := func(s string) string { return "[" + strings.ReplaceAll(s, "]", "]]") + "]" }
	qualified := quote(table)
	if schema != "" {
		qualified = quote(schema) + "." + qualified
	}
	return fmt.Sprintf("SELECT TOP %d * FROM %s", limit, qualified)
}
```

`strings` is already imported. `fmt` is NOT currently imported in `sqlserver.go` — `goimports` will add it automatically after you save, or add `"fmt"` to the import block manually.

- [ ] **Step 6: Add `DefaultSelectQuery` stubs to non-SQL plugins**

These plugins do not use SQL. Add a one-liner to each:

**`core/src/plugins/mongodb/mongodb.go`** — find the `FormatValue` method (around line 200) and add after it:

```go
// DefaultSelectQuery returns empty string; MongoDB does not use SQL SELECT syntax.
func (p *MongoDBPlugin) DefaultSelectQuery(schema, table string, limit int) string { return "" }
```

**`core/src/plugins/redis/redis.go`** — find `FormatValue` (around line 567) and add after it:

```go
// DefaultSelectQuery returns empty string; Redis does not use SQL SELECT syntax.
func (p *RedisPlugin) DefaultSelectQuery(schema, table string, limit int) string { return "" }
```

**`core/src/plugins/elasticsearch/elasticsearch.go`** — find `FormatValue` (around line 216) and add after it:

```go
// DefaultSelectQuery returns empty string; Elasticsearch does not use SQL SELECT syntax.
func (p *ElasticSearchPlugin) DefaultSelectQuery(schema, table string, limit int) string {
	return ""
}
```

**`core/src/plugins/memcached/memcached.go`** — find `FormatValue` (around line 176) and add after it:

```go
// DefaultSelectQuery returns empty string; Memcached does not use SQL SELECT syntax.
func (p *MemcachedPlugin) DefaultSelectQuery(schema, table string, limit int) string { return "" }
```

- [ ] **Step 7: Final build verification**

```bash
cd core && go build ./cmd/whodb
```

Expected: clean build with no errors. Every plugin now satisfies `PluginFunctions`.

- [ ] **Step 8: Commit**

```bash
git add core/src/engine/plugin.go \
        core/src/plugins/gorm/plugin.go \
        core/src/plugins/sqlserver/sqlserver.go \
        core/src/plugins/mongodb/mongodb.go \
        core/src/plugins/redis/redis.go \
        core/src/plugins/elasticsearch/elasticsearch.go \
        core/src/plugins/memcached/memcached.go
git commit -m "feat: add DefaultSelectQuery to PluginFunctions with dialect-correct implementations"
```

---

### Task 2: GraphQL schema field + resolver

**Files:**
- Modify: `core/graph/schema.graphqls`
- Modify: `core/graph/schema.resolvers.go`

**Interfaces:**
- Consumes: `DefaultSelectQuery(schema, table string, limit int) string` from Task 1
- Consumes: `getSourceSpecForContext(ctx)` → `(source.TypeSpec, *source.Credentials, error)` (existing helper in `graph/source_helpers.go:33`)
- Consumes: `sourceRefFromInput(ref *model.SourceObjectRefInput) *source.ObjectRef` (existing helper in `graph/source_helpers.go:126`)
- Consumes: `src.MainEngine.Choose(engine.DatabaseType) *engine.Plugin` (global engine in `src/src.go:34`)
- Produces: `DefaultTableQuery(ref: SourceObjectRefInput!, limit: Int!, schema: String): String!` GraphQL field

- [ ] **Step 1: Add the GraphQL field to the schema**

In `core/graph/schema.graphqls`, add this line to the `Query` type after `RunSourceQuery` (around line 904):

```graphql
  DefaultTableQuery(ref: SourceObjectRefInput!, limit: Int!, schema: String): String!
```

The auto-hook (`auto-graphql-codegen.sh`) runs `go generate ./...` automatically when `schema.graphqls` is saved. This regenerates `schema.resolvers.go` and inserts a stub at the bottom of the file.

- [ ] **Step 2: Verify the stub was generated**

After saving `schema.graphqls`, check the bottom of `core/graph/schema.resolvers.go` for a new stub:

```go
// DefaultTableQuery is the resolver for the DefaultTableQuery field.
func (r *queryResolver) DefaultTableQuery(ctx context.Context, ref model.SourceObjectRefInput, limit int, schema *string) (string, error) {
	panic(fmt.Errorf("not implemented: DefaultTableQuery - defaultTableQuery"))
}
```

If the hook did not run automatically, run manually:
```bash
cd core && go generate ./...
```

- [ ] **Step 3: Implement the resolver**

Replace the generated stub in `core/graph/schema.resolvers.go` with:

```go
// DefaultTableQuery is the resolver for the DefaultTableQuery field.
func (r *queryResolver) DefaultTableQuery(ctx context.Context, ref model.SourceObjectRefInput, limit int, schema *string) (string, error) {
	spec, _, err := getSourceSpecForContext(ctx)
	if err != nil {
		return "", err
	}
	plugin := src.MainEngine.Choose(engine.DatabaseType(spec.ID))
	if plugin == nil {
		return "", errors.New("unknown source type")
	}
	objectRef := sourceRefFromInput(&ref)
	if objectRef == nil || len(objectRef.Path) == 0 {
		return "", errors.New("invalid ref: missing path")
	}
	table := objectRef.Path[len(objectRef.Path)-1]
	schemaStr := ""
	if schema != nil {
		schemaStr = *schema
	}
	return plugin.DefaultSelectQuery(schemaStr, table, limit), nil
}
```

**Key details:**
- `getSourceSpecForContext` (not `getSourceSessionForContext`) — avoids opening a DB connection since query generation is dialect-static
- `spec.ID` is the raw database type string (e.g., `"Postgres"`, `"SQLServer"`) — identical to `engine.DatabaseType_*` constants
- `objectRef.Path` is the decoded path from the opaque locator — last element is the table name; the Locator field in `SourceObjectRefInput` is a base64-encoded `{kind, path}` JSON blob, NOT the table name directly
- `schema *string` is nullable because not all databases use schemas

- [ ] **Step 4: Verify build**

```bash
cd core && go build ./cmd/whodb
```

Expected: clean build. No "not implemented" panics remain.

- [ ] **Step 5: Commit**

```bash
git add core/graph/schema.graphqls core/graph/schema.resolvers.go
git commit -m "feat: add DefaultTableQuery GraphQL resolver"
```

---

### Task 3: Frontend — graphql file + codegen + `raw-execute.tsx`

**Files:**
- Create: `frontend/src/pages/raw-execute/default-table-query.graphql`
- Modify: `frontend/src/pages/raw-execute/raw-execute.tsx`

**Interfaces:**
- Consumes: `DefaultTableQuery(ref: SourceObjectRefInput!, limit: Int!, schema: String): String!` from Task 2
- Produces: `DefaultTableQueryDocument`, `useDefaultTableQueryLazyQuery` from `@graphql`

- [ ] **Step 1: Create the GraphQL query document**

Create `frontend/src/pages/raw-execute/default-table-query.graphql`:

```graphql
query DefaultTableQuery($ref: SourceObjectRefInput!, $limit: Int!, $schema: String) {
  DefaultTableQuery(ref: $ref, limit: $limit, schema: $schema)
}
```

- [ ] **Step 2: Run codegen**

```bash
cd frontend && pnpm generate
```

Expected: `src/generated/graphql.ts` and `src/generated/gql.ts` are updated. You should now be able to import `DefaultTableQueryDocument` from `@graphql`.

- [ ] **Step 3: Update `raw-execute.tsx` — replace hardcoded template**

Open `frontend/src/pages/raw-execute/raw-execute.tsx`.

**Remove** this import (line 5, if `formatSql` and `quoteIdentifier` are no longer used in the file):
```typescript
import { formatSql, quoteIdentifier } from "../../utils/format-sql";
```

Only remove it if a grep confirms these are not used elsewhere in the file:
```bash
grep -n "formatSql\|quoteIdentifier" frontend/src/pages/raw-execute/raw-execute.tsx
```

**Add** the Apollo and generated imports at the top of the file (with the existing Apollo imports if any, or after the React import):
```typescript
import { useLazyQuery } from "@apollo/client/react";
import { DefaultTableQueryDocument } from "@graphql";
```

**Add** `schema` to the Redux selectors (it's already selected as `state.database.schema` — confirm it exists on line ~19, keep it):
```typescript
const schema = useAppSelector(state => state.database.schema);
```

**Add** the lazy query hook inside `RawExecutePage` (after the existing `dispatch` and `tabs` selectors):
```typescript
const [fetchDefaultQuery] = useLazyQuery(DefaultTableQueryDocument);
```

**Replace** the `onSelectObject` callback (lines 32–39 currently):

Before:
```typescript
onSelectObject={obj => {
  const quotedName = quoteIdentifier(obj.Name, currentType);
  const qualified = schema ? `${quoteIdentifier(schema, currentType)}.${quotedName}` : quotedName;
  dispatch(SqlEditorActions.addSqlTab({
    name: obj.Name,
    code: formatSql(`SELECT * FROM ${qualified} LIMIT 100;`, currentType),
    autoRun: true,
  }));
}}
```

After:
```typescript
onSelectObject={async obj => {
  const { data } = await fetchDefaultQuery({
    variables: { ref: { Kind: obj.Ref.Kind, Path: obj.Ref.Path, Locator: obj.Ref.Locator }, limit: 100, schema: schema ?? null },
  });
  if (!data?.DefaultTableQuery) return;
  dispatch(SqlEditorActions.addSqlTab({
    name: obj.Name,
    code: data.DefaultTableQuery,
    autoRun: true,
  }));
}}
```

**Note on `obj.Ref` type:** `obj.Ref` is a `SourceObjectRef` (GraphQL output type) but the variable expects `SourceObjectRefInput` (input type). TypeScript may flag a mismatch. Use a spread to satisfy it:

```typescript
ref: { Kind: obj.Ref.Kind, Path: obj.Ref.Path, Locator: obj.Ref.Locator },
```

Both types have the same `Kind`, `Path`, and `Locator` fields — `Locator` is `String!` on the output type and `String` (nullable) on the input type, which is compatible at runtime.

- [ ] **Step 4: TypeScript build check**

```bash
cd frontend && pnpm run build:ce
```

Expected: compiles without type errors. If `obj.Ref` type doesn't match `SourceObjectRefInput`, check the generated types — `SourceObjectRef` and `SourceObjectRefInput` may need a cast or the query variable type adjusted.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/raw-execute/default-table-query.graphql \
        frontend/src/pages/raw-execute/raw-execute.tsx \
        frontend/src/generated/
git commit -m "feat: use server-side DefaultTableQuery in SQL editor table click"
```

---

### Task 4: Frontend — `explore-storage-unit.tsx`

**Files:**
- Modify: `frontend/src/pages/storage-unit/explore-storage-unit.tsx`

**Interfaces:**
- Consumes: `DefaultTableQueryDocument` from `@graphql` (generated in Task 3)
- Consumes: `currentUnitRef` = `unit?.Ref` (already available at line 256 of the component)
- Consumes: `schema` from Redux state (already selected in this component)

- [ ] **Step 1: Add import for `useQuery` and the document**

In `explore-storage-unit.tsx`, the `useQuery` hook is already imported (from `@apollo/client/react`). Add `DefaultTableQueryDocument` to the existing `@graphql` import block:

```typescript
import {
  // ... existing imports ...
  DefaultTableQueryDocument,
} from '@graphql';
```

- [ ] **Step 2: Replace `initialScratchpadQuery` useMemo with a useQuery**

Find and **remove** the `initialScratchpadQuery` useMemo block (lines 278–283):

```typescript
// REMOVE this entire block:
const initialScratchpadQuery = useMemo(() => {
    const name = unitName ?? '';
    const quotedName = quoteIdentifier(name, currentType);
    const qualified = schema ? `${quoteIdentifier(schema, currentType)}.${quotedName}` : quotedName;
    return `SELECT * FROM ${qualified} LIMIT 5`;
}, [schema, unitName, currentType]);
```

**Add** in its place:

```typescript
const { data: defaultQueryData } = useQuery(DefaultTableQueryDocument, {
    variables: { ref: currentUnitRef, limit: 5, schema: schema ?? null },
    skip: !currentUnitRef,
});
const initialScratchpadQuery = defaultQueryData?.DefaultTableQuery ?? '';
```

`currentUnitRef` is `unit?.Ref` (line 256). `schema` is already selected from Redux state in this component.

- [ ] **Step 3: Remove unused imports**

Check if `quoteIdentifier` is still used elsewhere in `explore-storage-unit.tsx`:

```bash
grep -n "quoteIdentifier" frontend/src/pages/storage-unit/explore-storage-unit.tsx
```

If the only occurrences were in the removed useMemo, remove the `quoteIdentifier` import. Do not remove `currentType` if it is still used by other parts of the component.

- [ ] **Step 4: Verify `scratchpadQueryWithConditions` still works**

The WHERE-injection block below `initialScratchpadQuery` (lines 285–300) uses a `/\s+LIMIT\s+\d+/i` regex. For SQL Server's `SELECT TOP 5 * FROM [schema].[table]`, this regex won't match, so the WHERE clause is appended at the end of the string — which is valid T-SQL (`SELECT TOP 5 * FROM [schema].[table] WHERE condition`). No change needed here.

- [ ] **Step 5: Final build verification**

```bash
cd frontend && pnpm run build:ce
```

Expected: clean build. Then also verify the backend:

```bash
cd core && go build ./cmd/whodb
```

- [ ] **Step 6: Manual smoke test**

Start the backend and frontend locally:
```bash
# Terminal 1
cd core && go run ./cmd/whodb
# Terminal 2
cd frontend && pnpm start
```

1. Log in with a **Postgres** connection → click a table in the SQL editor object tree → verify the generated query is `SELECT * FROM "schema"."table" LIMIT 100`
2. Log in with a **SQL Server** connection → click a table → verify `SELECT TOP 100 * FROM [schema].[table]`
3. Navigate to explore storage unit for either → verify the scratchpad query is correctly dialect-specific with limit 5

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/storage-unit/explore-storage-unit.tsx \
        frontend/src/generated/
git commit -m "feat: use server-side DefaultTableQuery in explore storage unit scratchpad"
```
