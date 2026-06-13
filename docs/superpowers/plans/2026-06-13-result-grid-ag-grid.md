# Result Grid on ag-grid — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace WhoDB's custom `StorageUnitTable` (`frontend/src/components/table.tsx`, ~1,898 lines) with a new ag-grid Community based `ResultGrid` used in all four call sites (SQL editor results, chat panel, explorer table, explorer scratchpad).

**Architecture:** ag-grid Community is the rendering/virtualization/selection/per-cell-edit/sort engine. Everything Community lacks stays WhoDB-owned "chrome" wrapped around the grid: the `@clidey/ux` context menu, `Export`/`ImportData` components, mock-data sheet, server-side sort + pagination, FK navigation, app keyboard shortcuts, source-action gating, and the footer. Native filtering (`quickFilterText` + per-column header filters) replaces the old search. The component exposes a cleaner grouped-props API; all call sites are refactored and the old `table.tsx` is deleted.

**Tech Stack:** React + TypeScript, `ag-grid-react` + `ag-grid-community` (MIT), `@clidey/ux`, Apollo Client, Redux Toolkit, Tailwind. Build: `pnpm` (`pnpm@10.29.3`). Verification: `tsc -p tsconfig.ce.json --noEmit` (type check), `pnpm exec oxlint src/` (lint), Playwright E2E (`pnpm e2e:ce:headless`). **There is no frontend component-unit test runner (no vitest/jest); per AGENTS.md the verification gates are type-check + lint + E2E.** This overrides the TDD-skill default of writing unit tests, because no such harness exists and the project's defined verification is build/lint/E2E. The PostToolUse hooks auto-run `oxlint --fix` on `.ts/.tsx` edits.

**Reference spec:** `docs/superpowers/specs/2026-06-13-result-grid-ag-grid-design.md`

---

## Conventions for every task

- Run all `pnpm`/`tsc` commands from `frontend/`.
- New files in this repo **omit the Apache/license header** (per user memory: no copyright headers on new code).
- All user-facing strings use `t()` with YAML keys; reuse existing `components/table.yaml` keys where the text is unchanged; add new keys to **en_US only**.
- Exported TS functions/components need JSDoc (AGENTS.md rule 4).
- Per-task verification baseline (the "type check" step below means): `cd frontend && pnpm exec tsc -p tsconfig.ce.json --noEmit` and `pnpm exec oxlint src/`.

---

## File Structure

New folder `frontend/src/components/result-grid/`:

| File | Responsibility |
|---|---|
| `types.ts` | `ResultGridProps` (grouped API) + shared types |
| `column-icons.tsx` | `getColumnIcons`, type `Set`s, `getInputPropsForColumnType` (moved verbatim from `table.tsx`) |
| `use-grid-theme.ts` | `useGridTheme()` → `themeQuartz` light/dark wired to `useTheme()` |
| `grid-header.tsx` | Custom header cell: type icon + PK/FK badge + sort indicator/trigger |
| `grid-column-defs.tsx` | `buildColumnDefs(...)` → `ColDef[]`, incl. type-aware editors & rowData mapping helper |
| `grid-context-menu.tsx` | Controlled `@clidey/ux` `ContextMenu` rendered at the right-clicked cell |
| `mock-data-sheet.tsx` | Mock-data sheet + dependency analysis (extracted from `table.tsx`) |
| `use-grid-shortcuts.ts` | App-level keyboard shortcuts (export/import/mock/refresh/page/edit/delete/select-all) |
| `result-grid.tsx` | Main component: `AgGridReact` + chrome orchestration + footer |
| `index.ts` | Public re-exports: `ResultGrid`, `getColumnIcons`, `getInputPropsForColumnType` |

Call sites refactored: `pages/raw-execute/query-view.tsx`, `pages/raw-execute/chat-panel.tsx`, `pages/storage-unit/explore-storage-unit.tsx` (×2: main table + scratchpad).

---

## Phase 1 — Foundation + read-only grid

### Task 1: Add ag-grid dependency and register Community modules

**Files:**
- Modify: `frontend/package.json` (via pnpm)
- Modify: `frontend/src/index.tsx`

- [ ] **Step 1: Install the dependency**

Run (from `frontend/`):
```bash
pnpm add ag-grid-react ag-grid-community
```
This installs the latest stable major (v33+, which uses the Theming API). `ag-grid-react` pulls in `ag-grid-community`. Both are MIT.

- [ ] **Step 2: Register all Community modules once at boot**

In `frontend/src/index.tsx`, add after the existing imports (around line 34, after `getBasePath` import):
```tsx
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Register all ag-grid Community features once for the whole app.
ModuleRegistry.registerModules([AllCommunityModule]);
```

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc -p tsconfig.ce.json --noEmit`
Expected: PASS (no errors). If ag-grid types are missing, confirm the install in Step 1 succeeded.

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/index.tsx
git commit -m "feat(result-grid): add ag-grid community + register modules"
```

---

### Task 2: Move column-icon helpers into the new module

Move `getColumnIcons`, the type `Set`s, `stripTypeSuffix`, and `getInputPropsForColumnType` out of `table.tsx` so they survive its deletion. Keep them importable from the new module.

**Files:**
- Create: `frontend/src/components/result-grid/column-icons.tsx`

- [ ] **Step 1: Create the file with the helpers**

Copy verbatim from `table.tsx` lines 143–277 into `frontend/src/components/result-grid/column-icons.tsx`: the type `Set`s (`stringTypes`…`xmlTypes`), `stripTypeSuffix`, `getColumnIcons`, and `getInputPropsForColumnType`. Add the heroicon imports they need (from `../heroicons`). Do NOT add a license header. Keep the existing JSDoc on `getInputPropsForColumnType`; add a one-line JSDoc to `getColumnIcons`:
```tsx
/**
 * Returns a type-appropriate icon element per column, matched by data type name.
 */
```
Leave `table.tsx`'s copies in place for now (removed in Task 13) so nothing breaks mid-migration.

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc -p tsconfig.ce.json --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/result-grid/column-icons.tsx
git commit -m "feat(result-grid): extract column-icon helpers"
```

---

### Task 3: Theme hook

**Files:**
- Create: `frontend/src/components/result-grid/use-grid-theme.ts`

- [ ] **Step 1: Implement the hook**

```ts
import { useMemo } from 'react';
import { useTheme } from '@clidey/ux';
import { themeQuartz } from 'ag-grid-community';

/**
 * Returns an ag-grid theme (Quartz) whose colour scheme follows WhoDB's
 * resolved light/dark mode, tuned to the surrounding neutral palette.
 */
export function useGridTheme() {
    const { theme } = useTheme();
    const darkModeEnabled =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return useMemo(() => {
        return themeQuartz.withParams({
            browserColorScheme: darkModeEnabled ? 'dark' : 'light',
            backgroundColor: darkModeEnabled ? '#171717' : '#ffffff',
            foregroundColor: darkModeEnabled ? '#e5e5e5' : '#262626',
            headerBackgroundColor: darkModeEnabled ? '#262626' : '#fafafa',
            borderColor: darkModeEnabled ? '#404040' : '#e5e5e5',
            rowHoverColor: darkModeEnabled ? '#262626' : '#f5f5f5',
            fontFamily: 'inherit',
            fontSize: '13px',
        });
    }, [darkModeEnabled]);
}
```

(Palette values mirror the Tailwind `neutral` shades used elsewhere; fine-tune in Task 12 against the live UI.)

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc -p tsconfig.ce.json --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/result-grid/use-grid-theme.ts
git commit -m "feat(result-grid): ag-grid theme wired to dark mode"
```

---

### Task 4: Types (grouped props API)

**Files:**
- Create: `frontend/src/components/result-grid/types.ts`

- [ ] **Step 1: Define the props**

```ts
import type { SourceObjectRefInput } from '@graphql';
import type React from 'react';

export interface ResultGridData {
    columns: string[];
    columnTypes?: string[];
    columnIsPrimary?: boolean[];
    columnIsForeignKey?: boolean[];
    rows: string[][];
}

export interface ResultGridLayout {
    height?: number;
    rowHeight?: number;
    enforceMinHeight?: boolean;
}

export interface ResultGridEditing {
    onRowUpdate: (row: Record<string, string | number>, originalRow?: Record<string, string | number>) => Promise<void>;
    allowRowUpdate?: boolean;
    allowRowDelete?: boolean;
    objectRef?: SourceObjectRefInput;
    storageUnit?: string;
    onRefresh?: () => void;
}

export interface ResultGridSorting {
    onColumnSort: (column: string) => void;
    sortedColumns?: Map<string, 'asc' | 'desc'>;
}

export interface ResultGridPagination {
    totalCount?: number;
    currentPage?: number;
    onPageChange?: (page: number) => void;
    pageSize?: number;
    show?: boolean;
}

export interface ResultGridActions {
    rawQuery?: string;
    allowImport?: boolean;
    isMockDataGenerationAllowed?: boolean;
    hideFooterControls?: boolean;
}

export interface ResultGridForeignKeys {
    isValidForeignKey?: (columnName: string) => boolean;
    onEntitySearch?: (columnName: string, value: string) => void;
}

export interface ResultGridProps {
    data: ResultGridData;
    layout?: ResultGridLayout;
    editing?: ResultGridEditing;
    sorting?: ResultGridSorting;
    pagination?: ResultGridPagination;
    actions?: ResultGridActions;
    foreignKeys?: ResultGridForeignKeys;
    databaseType?: string;
    /** Limits the context menu to copy/export only (used by read-only chat/scratchpad). */
    limitContextMenu?: boolean;
    /** Enables app-level keyboard shortcuts (explorer only). */
    enableKeyboardShortcuts?: boolean;
    /** Imperative search: sets the grid's quick-filter text. */
    searchRef?: React.MutableRefObject<((search: string) => void) | null>;
    /** Extra footer content (e.g. the explorer's add-row button). */
    children?: React.ReactNode;
}
```

- [ ] **Step 2: Type check** → `pnpm exec tsc -p tsconfig.ce.json --noEmit` → PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/result-grid/types.ts
git commit -m "feat(result-grid): grouped props types"
```

---

### Task 5: Custom header + column defs

**Files:**
- Create: `frontend/src/components/result-grid/grid-header.tsx`
- Create: `frontend/src/components/result-grid/grid-column-defs.tsx`

- [ ] **Step 1: Custom header component**

`grid-header.tsx`:
```tsx
import type { IHeaderParams } from 'ag-grid-community';
import { ChevronDownIcon, ChevronUpIcon, KeyIcon, ShareIcon } from '../heroicons';

export interface GridHeaderParams extends IHeaderParams {
    typeIcon?: React.ReactNode;
    isPrimary?: boolean;
    isForeignKey?: boolean;
    /** When set, clicking the header calls this (server-side sort) instead of native sort. */
    onServerSort?: () => void;
    serverSortDir?: 'asc' | 'desc';
}

/**
 * Header cell rendering the column's type icon, PK/FK badge, name, and sort arrow.
 * Sorting is server-side when `onServerSort` is provided, else native ag-grid sort.
 */
export function GridHeader(params: GridHeaderParams) {
    const { displayName, typeIcon, isPrimary, isForeignKey, onServerSort, serverSortDir } = params;

    const handleClick = () => {
        if (onServerSort) { onServerSort(); return; }
        params.progressSort(false);
    };

    const dir = onServerSort
        ? serverSortDir
        : (params.column.getSort() ?? undefined);

    return (
        <div
            className="flex items-center gap-1 w-full cursor-pointer select-none"
            data-testid={`column-header-${displayName}`}
            onClick={handleClick}
        >
            {typeIcon}
            <span className="truncate flex-1">{displayName}</span>
            {isPrimary && <KeyIcon className="w-3 h-3 opacity-70" />}
            {isForeignKey && <ShareIcon className="w-3 h-3 opacity-70" />}
            {dir === 'asc' && <ChevronUpIcon className="w-3 h-3" />}
            {dir === 'desc' && <ChevronDownIcon className="w-3 h-3" />}
        </div>
    );
}
```

- [ ] **Step 2: Column defs + rowData mapping**

`grid-column-defs.tsx`:
```tsx
import type { ColDef } from 'ag-grid-community';
import { GridHeader } from './grid-header';
import { getColumnIcons, getInputPropsForColumnType } from './column-icons';

const FIELD = (idx: number) => `c${idx}`;

/** Maps string[][] rows to ag-grid row objects keyed by column index (avoids duplicate-name collisions). */
export function buildRowData(rows: string[][]): Record<string, string>[] {
    return rows.map((row, rowIdx) => {
        const obj: Record<string, string> = { __rowIndex: String(rowIdx) };
        row.forEach((cell, colIdx) => { obj[FIELD(colIdx)] = cell; });
        return obj;
    });
}

export interface BuildColumnDefsArgs {
    columns: string[];
    columnTypes?: string[];
    columnIsPrimary?: boolean[];
    columnIsForeignKey?: boolean[];
    editable: boolean;
    /** Provided => server-side sort (header click calls onColumnSort); absent => native client sort. */
    onColumnSort?: (column: string) => void;
    sortedColumns?: Map<string, 'asc' | 'desc'>;
    t: (key: string) => string;
}

/** Builds ag-grid column definitions, including the type icon header and type-aware editors. */
export function buildColumnDefs(args: BuildColumnDefsArgs): ColDef[] {
    const { columns, columnTypes, columnIsPrimary, columnIsForeignKey, editable, onColumnSort, sortedColumns, t } = args;
    const icons = getColumnIcons(columns, columnTypes, t);

    return columns.map((name, idx): ColDef => {
        const rawType = columnTypes?.[idx] ?? '';
        const inputProps = getInputPropsForColumnType(rawType);
        const isNumber = inputProps.type === 'number';
        return {
            field: FIELD(idx),
            headerName: name,
            editable,
            sortable: !onColumnSort,         // native sort only when not server-side
            filter: true,                    // native per-column filter (Community)
            resizable: true,
            minWidth: 100,
            cellEditor: isNumber ? 'agNumberCellEditor' : 'agTextCellEditor',
            headerComponent: GridHeader,
            headerComponentParams: {
                typeIcon: icons[idx],
                isPrimary: columnIsPrimary?.[idx],
                isForeignKey: columnIsForeignKey?.[idx],
                onServerSort: onColumnSort ? () => onColumnSort(name) : undefined,
                serverSortDir: sortedColumns?.get(name),
            },
        };
    });
}
```

- [ ] **Step 3: Type check** → PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/result-grid/grid-header.tsx frontend/src/components/result-grid/grid-column-defs.tsx
git commit -m "feat(result-grid): custom header + column defs"
```

---

### Task 6: Minimal read-only ResultGrid + index

Render rows with theme, footer total count + export button, click-to-copy, and quick-filter `searchRef`. No editing/selection/context-menu yet (added in Phase 2/3).

**Files:**
- Create: `frontend/src/components/result-grid/result-grid.tsx`
- Create: `frontend/src/components/result-grid/index.ts`

- [ ] **Step 1: Implement the read-only core**

`result-grid.tsx`:
```tsx
import { AgGridReact } from 'ag-grid-react';
import type { GridApi, GridReadyEvent, CellClickedEvent, CellDoubleClickedEvent } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Button, toast } from '@clidey/ux';
import { useTranslation } from '@/hooks/use-translation';
import { copyToClipboard } from '@/services/clipboard';
import { formatNumber } from '@/utils/functions';
import { ArrowDownCircleIcon } from '../heroicons';
import { useGridTheme } from './use-grid-theme';
import { buildColumnDefs, buildRowData } from './grid-column-defs';
import type { ResultGridProps } from './types';

const DEFAULT_ROW_HEIGHT = 48;

/** ag-grid-based result grid. ag-grid renders/edits/selects; WhoDB owns the chrome. */
export function ResultGrid(props: ResultGridProps) {
    const { data, layout, actions, sorting, databaseType: _databaseType } = props;
    const { t } = useTranslation('components/table');
    const theme = useGridTheme();
    const apiRef = useRef<GridApi | null>(null);

    const editable = false; // Phase 3 wires real editability
    const columnDefs = useMemo(
        () => buildColumnDefs({
            columns: data.columns,
            columnTypes: data.columnTypes,
            columnIsPrimary: data.columnIsPrimary,
            columnIsForeignKey: data.columnIsForeignKey,
            editable,
            onColumnSort: sorting?.onColumnSort,
            sortedColumns: sorting?.sortedColumns,
            t,
        }),
        [data.columns, data.columnTypes, data.columnIsPrimary, data.columnIsForeignKey, editable, sorting, t],
    );
    const rowData = useMemo(() => buildRowData(data.rows), [data.rows]);

    const onGridReady = useCallback((e: GridReadyEvent) => { apiRef.current = e.api; }, []);

    // Quick-filter search via the imperative searchRef.
    useEffect(() => {
        if (!props.searchRef) return;
        props.searchRef.current = (search: string) => {
            apiRef.current?.setGridOption('quickFilterText', search);
        };
    }, [props.searchRef]);

    // Single-click copies a cell; debounced so a double-click cancels it.
    const clickTimer = useRef<number | null>(null);
    const onCellClicked = useCallback((e: CellClickedEvent) => {
        if (clickTimer.current) clearTimeout(clickTimer.current);
        const value = e.value;
        clickTimer.current = window.setTimeout(() => {
            if (value != null) {
                void copyToClipboard(String(value)).then(ok => { if (ok) toast.success(t('copiedToClipboard')); });
            }
        }, 200);
    }, [t]);
    const onCellDoubleClicked = useCallback((_e: CellDoubleClickedEvent) => {
        if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
        // double-click enters native edit (when editable); copy-row lives in the context menu
    }, []);

    const triggerExport = () => window.dispatchEvent(new CustomEvent('menu:trigger-export'));

    const rowHeight = layout?.rowHeight ?? DEFAULT_ROW_HEIGHT;
    const height = layout?.enforceMinHeight
        ? (layout?.height ?? 500)
        : Math.min((data.rows.length || 1) * rowHeight + 80, layout?.height ?? 500);

    return (
        <div className="flex flex-col w-full h-full" data-testid="result-grid">
            {!actions?.hideFooterControls && (
                <div className="flex items-center justify-end gap-2 px-2 py-1 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
                    <Button variant="secondary" onClick={triggerExport} className="flex gap-sm" data-testid="result-grid-export">
                        <ArrowDownCircleIcon className="w-4 h-4" />
                        {t('export')}
                    </Button>
                </div>
            )}
            <div style={{ height, width: '100%' }}>
                <AgGridReact
                    theme={theme}
                    columnDefs={columnDefs}
                    rowData={rowData}
                    rowHeight={rowHeight}
                    onGridReady={onGridReady}
                    onCellClicked={onCellClicked}
                    onCellDoubleClicked={onCellDoubleClicked}
                    suppressCellFocus={false}
                    getRowId={(p) => p.data.__rowIndex}
                />
            </div>
            {props.children}
        </div>
    );
}
```

`index.ts`:
```ts
export { ResultGrid } from './result-grid';
export { getColumnIcons, getInputPropsForColumnType } from './column-icons';
export type { ResultGridProps } from './types';
```

- [ ] **Step 2: Type check** → `pnpm exec tsc -p tsconfig.ce.json --noEmit` → PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/result-grid/result-grid.tsx frontend/src/components/result-grid/index.ts
git commit -m "feat(result-grid): minimal read-only grid"
```

---

### Task 7: Migrate the two read-only SQL call sites

**Files:**
- Modify: `frontend/src/pages/raw-execute/query-view.tsx:117-134`
- Modify: `frontend/src/pages/raw-execute/chat-panel.tsx:192-204`

- [ ] **Step 1: query-view.tsx**

Replace the `<StorageUnitTable .../>` block (lines 117–134) and update the import (line 22):
```tsx
// import line 22:
import { ResultGrid } from "../../components/result-grid";
```
```tsx
{
    data.RawExecute.Columns.length > 0 && (
        <ResultGrid
            key={containerWidth}
            data={{
                columns: data.RawExecute.Columns.map((c: any) => c.Name),
                columnTypes: data.RawExecute.Columns.map((c: any) => c.Type),
                rows: data.RawExecute.Rows,
            }}
            layout={{ height: Math.max(200, (height ?? 360) - TABLE_CHROME), enforceMinHeight: true }}
            actions={{ rawQuery: code, hideFooterControls: true }}
            databaseType={currentType}
        />
    )
}
```
Note: the toolbar with the export button already exists in `query-view.tsx` (lines 103–116) and `hideFooterControls: true` keeps `ResultGrid` from adding a second one. Leave that toolbar as-is.

- [ ] **Step 2: chat-panel.tsx**

Replace the `<StorageUnitTable .../>` block (lines 192–204) and update the import (line 42):
```tsx
import { ResultGrid } from "../../components/result-grid";
```
```tsx
<ResultGrid
    key={containerWidth}
    data={{
        columns: data?.Columns?.map(c => c.Name) ?? [],
        columnTypes: data?.Columns?.map(c => c.Type) ?? [],
        rows: data?.Rows ?? [],
    }}
    layout={{ height: 200, enforceMinHeight: true }}
    actions={{ rawQuery: text }}
    limitContextMenu={true}
    databaseType={currentType}
/>
```

- [ ] **Step 3: Type check + lint**

Run: `pnpm exec tsc -p tsconfig.ce.json --noEmit` then `pnpm exec oxlint src/`
Expected: PASS, no lint errors.

- [ ] **Step 4: Build**

Run: `pnpm run build:ce`
Expected: build succeeds.

- [ ] **Step 5: Manual verify (run the app)**

Use the `run` skill (or `cd frontend && pnpm start`). In the SQL editor, run `SELECT` and confirm the result grid renders rows, light/dark theme matches, single-click copies a cell, export button works. In a chat `sql:get`, confirm results render.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/raw-execute/query-view.tsx frontend/src/pages/raw-execute/chat-panel.tsx
git commit -m "feat(result-grid): migrate SQL editor + chat to ResultGrid"
```

---

## Phase 2 — Interaction layer (selection, context menu, export/import)

### Task 8: Row selection + context menu

**Files:**
- Create: `frontend/src/components/result-grid/grid-context-menu.tsx`
- Modify: `frontend/src/components/result-grid/result-grid.tsx`

- [ ] **Step 1: Context menu component**

`grid-context-menu.tsx` — a controlled menu positioned at `{x,y}`, built from `@clidey/ux` primitives (`ContextMenu`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuSub*`, `ContextMenuSeparator`). Props:
```tsx
export interface GridContextMenuState {
    x: number;
    y: number;
    rowIndex: number;
    colIndex: number;
}

export interface GridContextMenuProps {
    state: GridContextMenuState | null;
    onClose: () => void;
    onCopyCell: () => void;
    onCopyRow: () => void;
    onEditCell?: () => void;
    onDeleteRow?: () => void;
    onDeleteSelected?: () => void;
    selectedCount: number;
    onExport?: (format: 'csv' | 'excel', scope: 'selected' | 'all') => void;
    onForeignKey?: () => void;
    onMockData?: () => void;
    limited?: boolean;
    t: (key: string, opts?: Record<string, unknown>) => string;
}
```
Render the menu only when `state != null`, anchored via a fixed-position 1×1 trigger at `state.x/state.y`. Items: Copy cell (`copy`), Copy row (`rowCopiedToClipboard`→reuse label), Edit cell (`edit`) when `onEditCell`, Delete row / Delete selected (`delete`) when handlers present, an Export submenu (`exportAllAsCsv`/`exportAllAsExcel`/`exportSelectedAsCsv`/`exportSelectedAsExcel`) when `onExport`, Foreign-key navigate when `onForeignKey`, Generate mock data when `onMockData`. When `limited`, show only Copy cell / Copy row / Export. Reuse existing `components/table.yaml` keys (see lines 1296–1329 of the old `table.tsx` for the exact keys); add any missing key (e.g. `editCell`) to en_US only.

- [ ] **Step 2: Wire selection + context menu into result-grid.tsx**

Add to `<AgGridReact>`:
```tsx
rowSelection={props.editing || props.actions?.rawQuery ? { mode: 'multiRow', checkboxes: true, headerCheckbox: true } : undefined}
onCellContextMenu={onCellContextMenu}
preventDefaultOnContextMenu={true}
```
Add state + handler:
```tsx
const [menu, setMenu] = useState<GridContextMenuState | null>(null);
const onCellContextMenu = useCallback((e: CellContextMenuEvent) => {
    const ev = e.event as MouseEvent | undefined;
    if (!ev) return;
    ev.preventDefault();
    const colIndex = Number((e.column?.getColId() ?? 'c0').replace('c', ''));
    setMenu({ x: ev.clientX, y: ev.clientY, rowIndex: Number(e.data.__rowIndex), colIndex });
}, []);
```
Render `<GridContextMenu state={menu} onClose={() => setMenu(null)} ... />` with `onCopyCell`/`onCopyRow` using `copyToClipboard`, and selected-rows read via `apiRef.current!.getSelectedRows()`. For read-only sites, only copy + export handlers are passed (so the menu is effectively limited); pass `limited={props.limitContextMenu}`.

- [ ] **Step 3: Type check + lint** → PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/result-grid/grid-context-menu.tsx frontend/src/components/result-grid/result-grid.tsx
git commit -m "feat(result-grid): row selection + context menu"
```

---

### Task 9: Export + import wiring

**Files:**
- Modify: `frontend/src/components/result-grid/result-grid.tsx`

- [ ] **Step 1: Port export/import state from table.tsx**

Bring over from `table.tsx` (lines 461–494, 787–811): `selectedRowsData` (built from selected rows or, when `rawQuery`, all rows), `openExport`, the `menu:trigger-export` / `menu:trigger-import` window-event listeners, and the `<DynamicExport>` (use the existing `Export` component directly — the `EEExport` indirection in `table.tsx` resolves to `Export`, so import `Export` from `../export`) and `<ImportData>` sheets. Gate with `useSourceContract(databaseType)` + `sourceObjectSupportsAction` exactly as `table.tsx` does (lines 389–395). Selection comes from `apiRef.current.getSelectedRows()` mapped back to `Record<string, string>` keyed by real column name.

```tsx
import { Export } from '../export';
import { ImportData } from '../import-data';
import { useSourceContract } from '@/hooks/useSourceContract';
import { sourceObjectSupportsAction } from '@/config/source-types';
import { SourceAction } from '@graphql';
```

- [ ] **Step 2: Footer total count**

When `!actions?.hideFooterControls`, render the total-count line using `formatNumber(pagination?.totalCount ?? data.rows.length)` (reuse the `components/table.yaml` count key). Keep the export button already added in Task 6.

- [ ] **Step 3: Type check + lint** → PASS.

- [ ] **Step 4: Manual verify**

Run the app; in the SQL editor export results to CSV and Excel; confirm "export all" works and selected-row export works after checkbox selection.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/result-grid/result-grid.tsx
git commit -m "feat(result-grid): export + import wiring"
```

---

## Phase 3 — Full explorer (edit, delete, sort, paginate, mock-data, FK, keyboard)

### Task 10: Editing, delete, server sort, pagination, FK

**Files:**
- Modify: `frontend/src/components/result-grid/result-grid.tsx`

- [ ] **Step 1: Editability + per-cell update**

Compute `editable` from props instead of the Task-6 stub:
```tsx
const { item } = useSourceContract(databaseType);
const isRowUpdateSupported = sourceObjectSupportsAction(item, editing?.objectRef?.Kind, SourceAction.UpdateData);
const editable = !!editing && (editing.allowRowUpdate ?? true) && isRowUpdateSupported;
```
Pass `editable` into `buildColumnDefs`. Add `onCellEditingStopped`:
```tsx
const onCellEditingStopped = useCallback((e: CellEditingStoppedEvent) => {
    if (e.oldValue === e.newValue || !editing) return;
    const rowIdx = Number(e.data.__rowIndex);
    const updated: Record<string, string | number> = {};
    const original: Record<string, string | number> = {};
    data.columns.forEach((col, i) => {
        updated[col] = e.data[`c${i}`];
        original[col] = data.rows[rowIdx]?.[i];
    });
    void editing.onRowUpdate(updated, original)
        .then(() => { toast.success(t('rowUpdated')); editing.onRefresh?.(); })
        .catch(() => toast.error(t('errorUpdatingRow')));
}, [editing, data.columns, data.rows, t]);
```
Wire `onCellEditingStopped` on `<AgGridReact>`. Editing starts on double-click (native, since `editable` cols are double-click-editable), Enter/F2, or context-menu "Edit cell" (`apiRef.current?.startEditingCell({ rowIndex, colKey })`). Because single-click already copies, that coexists — double-click cancels the copy timer (Task 6) and ag-grid begins editing.

- [ ] **Step 2: Delete with confirm**

Port `doDeleteRows` / `handleDeleteRow` / confirm `AlertDialog` from `table.tsx` (lines 497–561, plus the dialog JSX). Gate with `DeleteData` support + `objectRef`. Wire context-menu "Delete row"/"Delete selected" to set `pendingDeleteIndexes`; on confirm call `deleteRow` mutation (import `DeleteRowDocument`), then `editing.onRefresh()`.

- [ ] **Step 3: Server sort**

`buildColumnDefs` already routes header clicks to `sorting.onColumnSort` when provided (Task 5) and disables native sort. No extra grid wiring needed; sort arrows come from `sorting.sortedColumns`. Confirm the explorer's existing `handleColumnSort`/`sortedColumnsMap` flow refetches on click.

- [ ] **Step 4: Server pagination footer**

When `pagination?.show`, render `DataPagination` (from `@clidey/ux`) in the footer using `pagination.currentPage`, `Math.ceil((pagination.totalCount ?? 0)/(pagination.pageSize ?? 100))`, and `pagination.onPageChange`. ag-grid's own `pagination` stays off.

- [ ] **Step 5: Foreign-key navigation**

In the context menu, when `foreignKeys?.isValidForeignKey?.(columnName)` is true for the clicked column, show a "navigate" item that calls `foreignKeys.onEntitySearch(columnName, cellValue)`.

- [ ] **Step 6: Type check + lint** → PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/result-grid/result-grid.tsx
git commit -m "feat(result-grid): editing, delete, server sort/pagination, FK"
```

---

### Task 11: Mock-data sheet + keyboard shortcuts

**Files:**
- Create: `frontend/src/components/result-grid/mock-data-sheet.tsx`
- Create: `frontend/src/components/result-grid/use-grid-shortcuts.ts`
- Modify: `frontend/src/components/result-grid/result-grid.tsx`

- [ ] **Step 1: Extract mock-data sheet**

Move the mock-data UI + logic out of `table.tsx` into `mock-data-sheet.tsx` as `<MockDataSheet>`: state (`mockDataRowCount`, `mockDataMethod`, `mockDataOverwriteExisting`, `mockDataFkDensityRatio`, confirmation), the `GenerateMockDataDocument` mutation, `AnalyzeMockDataDependenciesDocument` lazy query, `MockDataMaxRowCountDocument`, the `adjustedDepAnalysis` memo, and the `Sheet` JSX (table.tsx lines 382–397, 404, 649–785, and the sheet render). Props: `{ open, onOpenChange, objectRef, storageUnit, databaseType, onGenerated }`. Gate via `sourceObjectSupportsAction(..., SourceAction.GenerateMockData)`.

- [ ] **Step 2: Keyboard shortcuts hook**

`use-grid-shortcuts.ts` — port the app-level shortcut handler from `table.tsx` lines 884–1049, but KEEP ONLY the non-native shortcuts: `exportData`, `mockData`, `importData`, `refresh`, `selectAll`, `nextPage`, `prevPage`, `editRow`/`editRowAlt`, `deleteRow`/`deleteRowAlt`. Drop arrow/range navigation (`moveUp/Down/First/Last`, `pageUp/Down`, `extendSelect*`, `toggleSelect`, `closeDialogs`) — ag-grid handles cell/row navigation and range selection natively. Signature:
```ts
export function useGridShortcuts(opts: {
    enabled: boolean;
    api: GridApi | null;
    onExport?: () => void;
    onImport?: () => void;
    onMockData?: () => void;
    onRefresh?: () => void;
    onEditFocused?: () => void;
    onDeleteFocused?: () => void;
    onNextPage?: () => void;
    onPrevPage?: () => void;
}): void;
```
Use `matchesShortcut`/`SHORTCUTS` from `@/utils/shortcuts`. For select-all use `api.selectAll()`. For edit/delete focused, read `api.getFocusedCell()`.

- [ ] **Step 3: Wire into result-grid.tsx**

Add `showMockDataSheet` state; render `<MockDataSheet>` when `editing`. Call `useGridShortcuts({ enabled: !!props.enableKeyboardShortcuts, api: apiRef.current, ... })`. Wire the context menu's "Generate mock data" to open the sheet.

- [ ] **Step 4: Type check + lint** → PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/result-grid/mock-data-sheet.tsx frontend/src/components/result-grid/use-grid-shortcuts.ts frontend/src/components/result-grid/result-grid.tsx
git commit -m "feat(result-grid): mock-data sheet + keyboard shortcuts"
```

---

### Task 12: Migrate the explorer (main table + scratchpad)

**Files:**
- Modify: `frontend/src/pages/storage-unit/explore-storage-unit.tsx:84` (import), `:1109-1147` (main), `:1181-1194` (scratchpad)

- [ ] **Step 1: Update imports**

Line 84:
```tsx
import { getColumnIcons, getInputPropsForColumnType } from "../../components/result-grid";
import { ResultGrid } from "../../components/result-grid";
```

- [ ] **Step 2: Main explorer table**

Replace lines 1109–1147 (`<StorageUnitTable> ... children ... </StorageUnitTable>`) mapping the existing handlers/state into grouped props:
```tsx
<ResultGrid
    data={{
        columns,
        columnTypes,
        columnIsPrimary,
        columnIsForeignKey,
        rows: rows.Rows,
    }}
    layout={{ height: tableHeight }}
    editing={{
        onRowUpdate: handleRowUpdate,
        allowRowUpdate: allowsUpdateData,
        allowRowDelete: allowsDeleteData,
        objectRef: currentUnitRef,
        storageUnit: unitName,
        onRefresh: handleSubmitRequest,
    }}
    sorting={{ onColumnSort: handleColumnSort, sortedColumns: sortedColumnsMap }}
    pagination={{
        totalCount: Number.parseInt(totalCount, 10),
        currentPage,
        onPageChange: handlePageChange,
        pageSize,
        show: true,
    }}
    actions={{ allowImport: true, isMockDataGenerationAllowed }}
    foreignKeys={{ isValidForeignKey, onEntitySearch: handleEntitySearch }}
    databaseType={current?.Type}
    searchRef={searchRef}
    enableKeyboardShortcuts={true}
>
    {allowsInsertData && (
        <div className="flex gap-2">
            <Button onClick={handleOpenAddSheet} disabled={adding} data-testid="add-row-button">
                <PlusCircleIcon className="w-4 h-4" /> {t('addRowButton')}
            </Button>
        </div>
    )}
</ResultGrid>
```

- [ ] **Step 3: Scratchpad read-only table**

Replace lines 1181–1194:
```tsx
<ResultGrid
    key={scratchpadContainerWidth}
    data={{
        columns: rawExecuteData.RawExecute.Columns.map(c => c.Name),
        columnTypes: rawExecuteData.RawExecute.Columns.map(c => c.Type),
        rows: rawExecuteData.RawExecute.Rows,
    }}
    layout={{ enforceMinHeight: false }}
    actions={{ rawQuery: undefined }}
    editing={{
        onRowUpdate: async () => {},
        allowRowUpdate: false,
        objectRef: undefined,
        storageUnit: unitName,
        onRefresh: handleSubmitRequest,
    }}
    limitContextMenu={true}
    databaseType={current?.Type}
/>
```
(The scratchpad was read-only via `disableEdit`; `allowRowUpdate: false` reproduces that. If `onRowUpdate` is awkward as a no-op, instead omit `editing` entirely and pass only `data`/`databaseType`/`limitContextMenu` — read-only.)

- [ ] **Step 4: Type check + lint + build**

Run: `pnpm exec tsc -p tsconfig.ce.json --noEmit && pnpm exec oxlint src/ && pnpm run build:ce`
Expected: all PASS.

- [ ] **Step 5: Manual verify (explorer)**

Run the app. On a Postgres table: double-click a cell → edit → commit fires update + refresh; right-click → copy cell/row, delete row (with confirm), export, FK navigate; click a column header → server sort; paginate; quick-filter via the search box; generate mock data; dark/light theme parity. Tune `use-grid-theme.ts` palette values here if the grid looks off against the surrounding UI.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/storage-unit/explore-storage-unit.tsx
git commit -m "feat(result-grid): migrate explorer to ResultGrid"
```

---

## Phase 4 — Cleanup + full verification

### Task 13: Delete the old table component

**Files:**
- Delete: `frontend/src/components/table.tsx`

- [ ] **Step 1: Confirm no remaining imports**

Run:
```bash
grep -rn "components/table\b\|StorageUnitTable" frontend/src --include="*.tsx" --include="*.ts"
```
Expected: no matches (the helper imports now resolve to `components/result-grid`). If any remain, fix the import to `../../components/result-grid` first.

- [ ] **Step 2: Delete the file**

```bash
git rm frontend/src/components/table.tsx
```

- [ ] **Step 3: Type check + lint + build**

Run: `pnpm exec tsc -p tsconfig.ce.json --noEmit && pnpm exec oxlint src/ && pnpm run build:ce`
Expected: all PASS (proves no dead references).

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(result-grid): remove legacy StorageUnitTable"
```

---

### Task 14: E2E verification

- [ ] **Step 1: Run the storage-unit E2E suite**

Run (from `frontend/`): `pnpm e2e:ce:headless`
Expected: the explore/table, SQL-editor, and chat specs pass. If a spec asserts on old `StorageUnitTable` DOM/test-ids (e.g. `column-header-*`, `add-row-button`, export ids), reconcile: the plan preserved `data-testid="column-header-<name>"`, `add-row-button`, and added `result-grid` / `result-grid-export`. Update any spec that referenced removed internal test-ids to the new ones, keeping behavioral assertions intact.

- [ ] **Step 2: Fix failures**

For each failure, use `superpowers:systematic-debugging`. Re-run until green.

- [ ] **Step 3: Final commit (if specs changed)**

```bash
git add frontend/e2e
git commit -m "test(result-grid): align E2E with ResultGrid"
```

---

## Self-Review (completed by plan author)

- **Spec coverage:** scope (Tasks 7, 12, 13 cover all 4 usages incl. scratchpad), Community edition (Task 1), engine+chrome split (Tasks 6/8/9/10/11), new grouped API (Task 4), per-cell editing (Task 10 Step 1), click-copy + double-click-edit (Tasks 6/10), native filter search (Task 6 quick filter + Task 5 `filter: true`), context menu/export/import/mock-data (Tasks 8/9/11), server sort+pagination (Tasks 5/10), FK nav (Task 10 Step 5), theme (Task 3, tuned Task 12), keyboard shortcuts (Task 11), source-action gating (Tasks 9/10), helper re-export (Tasks 2/12), file deletion (Task 13), verification (Tasks 7/9/12/13/14). All covered.
- **Placeholders:** none — code shown for each code step; the one optional fallback (scratchpad `editing` omission) is explicitly described.
- **Type consistency:** `buildColumnDefs`/`buildRowData`/`GridHeader`/`useGridTheme`/`ResultGridProps` names and signatures are consistent across Tasks 4–12; field convention `c{idx}` + `__rowIndex` used uniformly.
- **Note:** ag-grid option names (`rowSelection` object form, `setGridOption('quickFilterText')`, `startEditingCell`, `agNumberCellEditor`) reflect the current v33+ API; confirm against the installed version's types during Task 6/8/10 (type check will catch drift).
