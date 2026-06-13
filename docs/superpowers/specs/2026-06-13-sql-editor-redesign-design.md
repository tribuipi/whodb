# SQL Editor Redesign (pgconsole-style)

**Date:** 2026-06-13
**Status:** Approved design — ready for implementation plan

## Summary

Replace the existing multi-cell **Scratchpad** (`/scratchpad`) with a full-screen,
pgconsole-style **SQL Editor**. The new page is a three-panel layout:

```
┌──────────────┬────────────────────────────────┬──────────────┐
│  Source ▾    │  Tabs                          │   Chat       │
│  Database ▾  │  Toolbar (Run · Format)        │   (embedded) │
│  ──────────  │  Editor                        │              │
│  DB object   │  ── status bar ──              │   (360px,    │
│  tree        │  Results (resizable split)     │   collapsible)│
│  (220px,     │                                │              │
│   resizable) │                                │              │
└──────────────┴────────────────────────────────┴──────────────┘
```

The old multi-cell-per-page model is dropped in favor of **one editor per tab**,
matching pgconsole exactly. The page renders **full-viewport, outside** the existing
`InternalPage` sidebar wrapper.

## Goals

- A SQL editor UI visually and behaviorally matching the pgconsole reference.
- Reuse existing WhoDB execution, results rendering, and chat logic where possible.
- Keep the public source-first GraphQL contract unchanged (`RunSourceQuery`).

## Non-Goals

- pgconsole toolbar items **Explain**, **Quick SQL**, and **Processes** (out of scope; only **Run** and **Format**).
- The pgconsole **"Context"** chat tab (out of scope; ship the single "Chat" view only).
- Backend / GraphQL schema changes — this is a frontend-only redesign.

## Layout

Full-viewport page with three horizontally-arranged panels. **No WhoDB global nav**
on this page — it renders outside `InternalPage`. A small back/home control in the
toolbar/header area lets users navigate back to the rest of WhoDB.

| Panel | Default width | Behavior |
|-------|---------------|----------|
| DB object tree (left) | 220px | Resizable via right-edge drag handle |
| Editor + results (center) | flex (fills) | Editor/results split is vertically resizable |
| Chat (right) | 360px | Resizable via left-edge drag handle; collapsible; width persisted |

## Components

### 1. Source selectors (left panel, top) — **new**

Because the WhoDB nav (which hosted the profile/database/schema dropdowns) is gone, the
left panel gets its own data-source selectors at the very top, above the object tree:

- **Profile/source dropdown** — the connected login profile/source (the `authProfile`
  used by `buildSourceScopeRef`).
- **Database dropdown** — the database within the selected profile.
- Schema selection is **not** here — it stays in the tree header (see below).
- Changing the profile or database refreshes the object tree and the chat's source
  context. Reuses the same source/database state the old WhoDB sidebar drove
  (profile + `state.database`).

### 2. DB Object Tree (left panel) — **new component**

A new tree component styled pixel-for-pixel to pgconsole (we are **not** reusing
`SchemaViewer`).

- **Header** shows the current schema name (e.g. `PUBLIC`); clicking opens a schema
  switcher dropdown of available schemas.
- **Search box** filters objects across all groups live.
- **Collapsible groups** by object type — Tables, Views, Functions, plus whatever the
  source exposes (Procedures, Materialized views, …) — each with a count badge.
- **Single-click** an object → opens a new tab pre-filled with `SELECT * FROM <obj> LIMIT …`.
- Data: fetched from the same source-catalog queries the app already uses to enumerate
  schema objects. (Grouping/counts logic is reimplemented in the new component rather
  than imported from `SchemaViewer`.)

### 3. Tabs (center, top)

- Each tab = one independent SQL editor with its own code + results state.
- **+** adds a new empty tab named `SQL N`.
- **Double-click** a tab name to rename.
- **✕** closes a tab (confirm if it has content). At least one tab always remains.
- Tabs and their code **persist to `localStorage`** via the Redux slice (survive reload).

### 4. Toolbar (center) — Run & Format only

- **Run** — executes the current tab's SQL, or the selected text if there is a selection.
  Keyboard: `⌘↵` / `Ctrl+↵`. Reuses the existing GraphQL mutation
  `RunSourceQuery` (client document `RawExecuteDocument`, from
  `pages/raw-execute/raw-execute.graphql`).
- **Format** — pretty-prints the SQL in the active editor in place, using the
  [`sql-formatter`](https://www.npmjs.com/package/sql-formatter) library (MIT, dialect-aware).
- **Destructive-query confirmation** (INSERT/UPDATE/DELETE/DDL) is preserved via the
  existing `isDestructiveQuery()` check in `utils/query-utils.ts`.

### 5. Editor (center)

- CodeMirror SQL editor (reuse the existing `components/editor.tsx`).
- A **status bar** between editor and results shows `search_path` and cursor line/column.

### 6. Results panel (center, below editor)

- **Reuses the existing `QueryView` component** from `pages/raw-execute/query-view.tsx`
  for the results table (search, copy, export, add-row already implemented).
- Non-SELECT statements show the existing "Action Executed" success state.
- Errors render inline in the results area (red banner), as today.
- Editor/results split is vertically resizable.

### 7. Chat (right panel) — **extract shared component**

Extract the existing Chat page (`pages/chat/chat.tsx`, `ChatPage`) core into a
**reusable component** rendered both at the standalone `/chat` route and embedded in the
editor's right panel — single source of truth.

- Reuses existing chat infrastructure: the `useAI()` hook (`components/ai.tsx`) for the
  model picker, schema from Redux (`state.database.schema`), source context via
  `buildSourceScopeRef(...)`, and the existing streaming endpoint `/api/ai-chat/stream`
  (chat is already non-GraphQL; embedding reuses it unchanged).
- Each AI response containing SQL gets actions: **▶ Run**, **⤵ Insert into active editor**,
  **⎘ Copy**.
- Collapsible; width persisted.
- Chat shares the current schema/source so generated SQL targets the right database.

## State Management

Replace the current `store/scratchpad.ts` slice (multi-page, multi-cell) with a
simplified slice modeling **tabs**:

- `tabs[]` — `{ id, name, code }`
- `activeTabId`
- Actions: add tab, close tab, rename tab, update tab code, set active tab,
  insert-text-at-cursor (for tree clicks / chat insert).
- Persisted to `localStorage` (registered in `store/index.ts`, same persistence
  mechanism the scratchpad slice uses today).

Per-tab **results** are component-local state (not persisted), keyed by tab.

## Routing

- `/scratchpad` route (`InternalRoutes.RawExecute`) is repurposed/renamed to the SQL
  Editor. The new page component renders **outside** `InternalPage` (full viewport),
  unlike the current scratchpad which is wrapped by it.
- `SourceSurfaceRoute` feature-support wrapping is retained.
- The standalone `/chat` route keeps working, now rendering the extracted shared chat
  component.

## Files

**Removed / replaced**
- `pages/raw-execute/raw-execute.tsx` — rewritten as the new SQL Editor page.
- `store/scratchpad.ts` — replaced with the simplified tabs slice.

**Reused as-is (or near)**
- `pages/raw-execute/query-view.tsx` (`QueryView`) — results rendering.
- `pages/raw-execute/raw-execute.graphql` (`RawExecuteDocument` / `RunSourceQuery`).
- `components/editor.tsx` — CodeMirror editor.
- `utils/query-utils.ts` (`isDestructiveQuery`).

**New**
- Source selectors (profile + database dropdowns) for the left panel top.
- DB object tree component.
- Three-panel layout shell for the editor page.

**Modified**
- `pages/chat/chat.tsx` — extract `ChatPage` core into a shared, embeddable component.
- `config/routes.tsx` — point the editor route at the new full-screen page.
- `store/index.ts` — register the new tabs slice.

**New dependency**
- `sql-formatter` (npm) for the Format button.

## Localization

- All new user-facing strings use `t()` with YAML keys in `en_US` only.
- Update `locales/pages/raw-execute.yaml` for the new editor strings (drop obsolete
  multi-cell keys like `addCell`, `deleteCell`); reuse/extend `locales/pages/chat.yaml`
  for embedded-chat strings. No hardcoded UI text.

## Testing & Verification

- Frontend type check: `pnpm run build:ce`.
- No lint errors (oxlint via the auto-hook).
- No dead code — removed scratchpad multi-cell logic fully deleted, no orphaned imports.
- Playwright E2E: update/extend the scratchpad E2E to exercise the new editor
  (run a query, see results; click a tree object to open a SELECT tab; format SQL).
- Manual: run a SELECT, run a destructive query (confirm dialog), click a tree object
  (opens SELECT tab), insert from chat response, collapse/resize panels, reload
  (tabs persist).

## Open Questions

None — all design decisions resolved during brainstorming.
