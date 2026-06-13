# Result Grid Reimplementation on ag-grid — Design

**Date:** 2026-06-13
**Branch:** feat/sql-editor-redesign
**Status:** Approved decisions; pending spec review

## Goal

Replace WhoDB's custom result grid (`frontend/src/components/table.tsx`,
`StorageUnitTable`, ~1,898 lines) with a new ag-grid-based component used in all
three current call sites: the storage-unit explorer, the SQL editor results, and
the chat panel.

## Locked Decisions

1. **Scope:** all usages of `StorageUnitTable`.
2. **ag-grid edition:** Community (MIT). Apache-2.0-compatible with the CE codebase.
3. **Feature mapping:** hybrid — ag-grid native for rendering/sort/resize/reorder/
   selection/cell-editing; WhoDB chrome for everything Community lacks.
4. **Contract:** new component with a cleaner API; refactor all 3 call sites; delete
   the old `table.tsx` once migrated.
5. **Editing:** per-cell native editing. Committing a cell fires
   `onRowUpdate(updatedRow, originalRow)` with that single change applied.
6. **Click-to-copy:** preserved everywhere (single-click = copy cell, double-click =
   copy row). To avoid colliding with ag-grid's default double-click-to-edit, set
   `suppressClickEdit: true`; editing starts via **Enter/F2** or a context-menu
   **"Edit cell"** action.
7. **Search:** keep the existing highlight-and-cycle behavior (imperative
   `searchRef`), reimplemented on ag-grid's API. Not the native quick filter (which
   hides rows).

## Verified External Facts (proof)

- **Community vs Enterprise** (https://www.ag-grid.com/javascript-data-grid/community-vs-enterprise/):
  Community includes rendering, row/column virtualization, sorting, column filters,
  cell editing, row selection, pagination, **CSV** export. Enterprise-only:
  **context menu, clipboard/range copy, Excel export, row grouping, master/detail.**
  → We must keep WhoDB's own context menu, clipboard, and Excel/NDJSON export.
- **React setup** (https://www.ag-grid.com/react-data-grid/getting-started/):
  install `ag-grid-react` (pulls in `ag-grid-community`); register
  `AllCommunityModule` via `ModuleRegistry.registerModules([...])` once at boot.
- **Theming** (https://www.ag-grid.com/react-data-grid/theming-colors/):
  current Theming API uses theme objects (`themeQuartz`) with light/dark color
  schemes; pass a `theme` prop to `AgGridReact`. WhoDB already derives
  `darkModeEnabled` in `editor.tsx:189` from `useTheme()` — reuse that.

## Architecture: engine + chrome

ag-grid renders rows/cells, manages virtualization, native sort UI, row selection,
and per-cell editing. Everything else stays WhoDB-owned and wraps the grid:

| Concern | Provider |
|---|---|
| Row/col virtualization, cell render, cell edit, row selection, sort UI | ag-grid native |
| Right-click menu | `@clidey/ux` `ContextMenu`, positioned at the clicked cell |
| Export (CSV/Excel/NDJSON, selected/all) | existing `Export` component |
| Import | existing `ImportData` component |
| Mock-data generation + dependency analysis | extracted `mock-data-sheet.tsx` |
| Server-side sort + server-side pagination | WhoDB callbacks (`onColumnSort`, `onPageChange`) |
| Search highlight/cycle | `use-grid-search` over the grid API |
| FK navigation | `onEntitySearch` + `isValidForeignKey` |
| App keyboard shortcuts (export/import/mock/refresh/page/edit/delete/select-all) | `use-grid-shortcuts` |
| Source-action gating | `useSourceContract` + `sourceObjectSupportsAction` |
| Footer (total count, pagination, import/export) | custom; hideable |
| Theme (light/dark) | `use-grid-theme` → `themeQuartz` |

Native ag-grid handles arrow/range navigation and selection, so the custom keyboard
code shrinks to the app-specific shortcuts only.

## Component & File Layout

New folder `frontend/src/components/result-grid/`:

```
result-grid.tsx        Main component: AgGridReact + chrome orchestration
grid-column-defs.tsx   Builds ColDef[] from columns/types; type-aware cell editors
grid-header.tsx        Custom header cell: type icon + PK/FK badge + sort indicator
grid-context-menu.tsx  Controlled @clidey/ux ContextMenu at the right-clicked cell
mock-data-sheet.tsx    Extracted from table.tsx (dependency analysis + generate)
use-grid-theme.ts      themeQuartz light/dark wired to useTheme()
use-grid-search.ts     Imperative searchRef → ensureIndexVisible/ensureColumnVisible + highlight
use-grid-shortcuts.ts  App-level keyboard shortcuts (non-native)
column-icons.tsx       getColumnIcons + type Sets + getInputPropsForColumnType (moved here)
types.ts               Props and shared types
index.ts               Public re-exports (ResultGrid, getColumnIcons, getInputPropsForColumnType)
```

`getColumnIcons` and `getInputPropsForColumnType` remain exported because
`explore-storage-unit.tsx`'s add-row sheet imports them.

## Data Mapping

- Input rows are `string[][]`. ag-grid wants row objects, so map each row to
  `{ c0: v0, c1: v1, ... }` and give each `ColDef` `field: "c{idx}"`. Indexed fields
  avoid collisions when a query returns duplicate column names.
- `headerName` is the real column name; the custom header component renders the type
  icon and PK/FK badge.
- A stable `getRowId` (row index within the page) supports selection and edit
  round-tripping.

## Props (cleaner grouped API)

`ResultGrid` takes grouped props instead of the current flat 30+ prop list:

- `data`: `{ columns, columnTypes?, columnIsPrimary?, columnIsForeignKey?, rows }`
- `layout`: `{ height, enforceMinHeight?, rowHeight? }`
- `editing?`: `{ onRowUpdate, allowRowUpdate?, allowRowDelete?, objectRef, storageUnit, onRefresh }`
- `selection?`: `{ enabled }` (multi-select with checkbox column)
- `sorting?`: `{ onColumnSort, sortedColumns }` (server-side)
- `pagination?`: `{ totalCount, currentPage, onPageChange, pageSize, show }` (server-side)
- `actions?`: `{ rawQuery?, allowImport?, isMockDataGenerationAllowed?, hideFooterControls? }`
- `foreignKeys?`: `{ isValidForeignKey, onEntitySearch }`
- `databaseType?`, `searchRef?`, `enableKeyboardShortcuts?`, `limitContextMenu?`, `children?`

Read-only call sites (SQL editor, chat) pass only `data`, `layout`, `actions.rawQuery`,
`databaseType`. The explorer passes the full set.

## Feature Mapping Details

- **Editing:** `colDef.editable = canEditRows`. `suppressClickEdit: true` so clicks
  never start an edit. Edit starts on Enter/F2 or context-menu "Edit cell".
  `onCellEditingStopped` builds `updatedRow`/`originalRow` from the row's current and
  prior values and calls `onRowUpdate`, then `onRefresh`. Type-aware editors:
  ag-grid number editor for int/float types (reusing the int/float type Sets and the
  `e/E/+` keydown guard from `getInputPropsForColumnType`); text editor otherwise.
- **Selection:** native `rowSelection: 'multiple'` with a checkbox column; selected
  rows read via the grid API for export and bulk delete. Replaces the custom
  `checked[]` + manual range logic.
- **Sort:** native sort UI on the custom header; `onSortChanged` maps to the
  server-side `onColumnSort`; initial sort state derives from `sortedColumns`. Grid is
  not given a client-side comparator (data is already server-sorted).
- **Pagination:** server-side. ag-grid `pagination` stays off; the custom footer
  renders `DataPagination` and calls `onPageChange`.
- **Context menu:** `onCellContextMenu` captures `{rowIndex, colIndex, x, y}` and
  opens a controlled `@clidey/ux` `ContextMenu` with: copy cell, copy row, edit cell,
  delete row (+ delete selected), export submenu (CSV/Excel selected/all), FK
  navigate (when `isValidForeignKey`), generate mock data. Items gated by
  source-action support and `limitContextMenu`.
- **Click-to-copy:** `onCellClicked` → `copyToClipboard(cell)`;
  `onCellDoubleClicked` → copy whole row (tab-joined). Preserved in every mode.
- **Search:** `searchRef.current = (term) => ...` scans `rows`, finds matches, and on
  each call advances to the next match: `api.ensureIndexVisible(row)`,
  `api.ensureColumnVisible(col)`, then flash/highlight the cell (cellClassRules or
  `flashCells`). Cycling state mirrors the current implementation.
- **Export/Import/Mock:** reuse `Export` and `ImportData` unchanged; extract the
  mock-data sheet into `mock-data-sheet.tsx`. Triggered via context menu, the existing
  `menu:trigger-export` / `menu:trigger-import` window events, and keyboard shortcuts.
- **Keyboard:** `use-grid-shortcuts` keeps export/mock/import/refresh/page-nav/
  edit/delete/select-all (the SHORTCUTS map). Arrow/range navigation is native.
- **Theme:** `use-grid-theme` returns a `themeQuartz` instance whose color scheme
  follows `darkModeEnabled`, tuned to WhoDB's neutral palette so the grid matches the
  surrounding UI in both modes.

## Migration

1. Add the dependency (see Open Item below) and register `AllCommunityModule` once at
   app boot (`index.tsx`).
2. Build `ResultGrid` and supporting files.
3. Refactor call sites to `ResultGrid`:
   - `pages/raw-execute/query-view.tsx` (read-only)
   - `pages/raw-execute/chat-panel.tsx` (read-only)
   - `pages/storage-unit/explore-storage-unit.tsx` (full: edit/delete/sort/paginate/
     FK/mock/import/keyboard, plus the add-row `children` button)
4. Delete `components/table.tsx` after confirming no remaining imports; keep
   `getColumnIcons`/`getInputPropsForColumnType` available from the new module.

## Phasing (de-risked, read-only first)

1. **Foundation + read-only:** deps, module registration, theme hook, column-defs,
   custom header, basic `ResultGrid`; migrate SQL editor + chat panel. Verify.
2. **Interaction layer:** selection, context menu, click-to-copy, search, export/import
   wiring.
3. **Full explorer:** editing, delete + confirm, server sort, server pagination,
   mock-data sheet, FK navigation, keyboard shortcuts; migrate the explorer. Verify.
4. **Cleanup:** delete old `table.tsx`; remove orphaned imports; final verification.

## Localization

All user-facing strings via `t()`. Reuse existing `components/table.yaml` keys where
text is unchanged to avoid re-translation; add new keys (en_US only) for any new
strings (e.g. context-menu "Edit cell" if not already present).

## Risks / Notes

- **UX shifts** (accepted): per-cell editing replaces whole-row editing; editing now
  starts via Enter/F2 or the context menu rather than a click.
- **Bundle size:** ag-grid-community adds weight; import `AllCommunityModule` once and
  rely on tree-shaking. Acceptable for this app.
- **Theme parity** is the main visual risk; tune `themeQuartz` params against the
  existing table look in both light and dark.
- **Type round-trip:** ag-grid coerces values; ensure edited cells are stringified the
  same way the backend expects (the current `onRowUpdate` contract uses
  `Record<string, string | number>`).

## Open Item (resolve at implementation, not blocking design)

- **Package manager:** both `pnpm-lock.yaml` (tracked) and a newer untracked
  `bun.lock` exist. Confirm which manager to use before adding `ag-grid-react`, and
  pin the latest stable major.

## Verification / Success Criteria

- `pnpm run build:ce` (frontend type check) passes; `oxlint` clean; `go build ./cmd/whodb`
  unaffected.
- No dead code; old `table.tsx` removed; all three call sites compile against `ResultGrid`.
- Playwright E2E green for: explorer (view/edit/delete/sort/paginate/export/import/FK/
  mock), SQL editor results, chat results.
- Manual verification per `verify` skill: edit a cell, delete a row, sort, paginate,
  export CSV, FK navigate, search highlight, dark/light theme.
