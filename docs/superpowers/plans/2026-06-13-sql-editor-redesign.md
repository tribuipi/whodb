# SQL Editor Redesign (pgconsole-style) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace WhoDB's multi-cell Scratchpad with a full-screen, pgconsole-style SQL Editor: a three-panel layout (source selectors + DB object tree | tabbed editor + results | collapsed-by-default embedded chat).

**Architecture:** A new full-viewport page rendered *outside* `InternalPage`. A new `sql-editor` Redux slice (one editor per tab, replacing the multi-cell `scratchpad` slice) persists tabs to localStorage. The page composes new presentational components (layout shell, source selectors, DB tree, tabs bar, toolbar, structure panel) and reuses existing pieces (`CodeEditor`, `QueryView`, the `RawExecute` query, `ChatPage` core, `SourceFieldConstraints` query).

**Tech Stack:** React + TypeScript, Redux Toolkit + redux-persist, Apollo Client, CodeMirror (`components/editor.tsx`), `@clidey/ux` components, `sql-formatter` (new dep), i18next localization, Playwright E2E.

**Testing approach:** The frontend has **no unit-test runner** (no vitest/jest) — verification is `pnpm run typecheck` / `pnpm run build:ce`, `pnpm run lint`, and Playwright E2E (`pnpm e2e:feature scratchpad`). Each task below verifies with typecheck + lint; behavioral coverage lands in the E2E task (Task 15). New interactive components expose `data-testid` attributes so E2E can drive them.

---

## Reference: Existing APIs (verbatim, gathered from the codebase)

**Redux store registration** (`src/store/index.ts`):
- Reducers registered in `ceReducerMap`. Scratchpad currently:
  `scratchpad: persistReducer({ key: "scratchpad", storage, transforms: [scratchpadTransform], throttle: PERSIST_THROTTLE }, scratchpadReducers)`.
- A startup block (lines ~39-65) reads/clears `localStorage['persist:scratchpad']`.
- `scratchpadTransform` (lines ~67-115) is a `createTransform` for cell-history dates.
- `RootState`, `AppDispatch` exported at bottom. `useAppSelector`/`useAppDispatch` live in `src/store/hooks`.

**Database slice** (`src/store/database.ts`):
- State: `{ schema: string }`. Action: `DatabaseActions.setSchema(value: string)`.

**Auth slice** (`src/store/auth.ts`):
- State: `{ status, current?: LocalLoginProfile, profiles: LocalLoginProfile[], sslStatus?, isEmbedded }`.
- `LocalLoginProfile` has `Id, Type, Hostname, Database, Username, Password, Advanced, Values, DisplayName?`.
- Actions: `AuthActions.switch({ id })`, `AuthActions.setLoginProfileDatabase({ id, database })`.

**Profile/database/schema switching** (`src/components/sidebar/sidebar.tsx`) — reuse these patterns:
- Profile change calls a `switchProfile(selectedProfile, database?)` helper. Source: `import { switchProfile } from ...` — locate via the sidebar's import (it is the canonical "switch profile and reconnect" routine). The new source selectors must call the same helper.
- Databases query: `SourceFieldOptionsDocument` from `src/pages/auth/database.graphql`, variables `{ sourceType: current.Type }`, returns `{ SourceFieldOptions: string[] }`.
- Schemas query: `GetSchemaDocument` from `src/components/sidebar/get-schema.graphql`, variables built by `buildSourceSchemaQuery(item, current)` from `src/utils/source-refs.ts`, returns `{ Schema: SourceObject[] }`.
- Contract flags from `useSourceContract(currentType)`: `supportsSchema`, `supportsDatabaseSwitching`, `usesDatabaseInsteadOfSchema`, `supportsScratchpad`, `supportsChat`, plus `item` (the `SourceTypeItem`).

**DB objects (tree data)**:
- `GetStorageUnitsDocument` from `src/pages/storage-unit/storage-units.graphql`: `query GetStorageUnits($parent: SourceObjectRefInput) { StorageUnit: SourceObjects(parent) { Ref { Kind Locator Path } Kind Name Attributes: Metadata { Key Value } Actions HasChildren } }`. Returns `SourceObject[]` with `Kind: SourceObjectKind`, `Name`, `Ref`.
- `SourceObjectKind` enum (generated) includes `Table`, `View`, `Function`, `Procedure`, etc. Group the returned objects by `Kind`.

**Table structure (structure tab)**:
- `SourceFieldConstraintsDocument` from `src/pages/storage-unit/source-field-constraints.graphql`, variables `{ ref: SourceObjectRefInput! }`. Returns `SourceFieldConstraints: Array<{ Name, Type, MetadataFidelity, Nullable?, Primary, Unique, Identity, DefaultValue?, AllowedValues, CheckMin?, CheckMax?, Length?, Precision?, Scale?, ForeignKey?: { Table, Column } }>`.

**Query execution + results**:
- `QueryView` (`src/pages/raw-execute/query-view.tsx`), props `IPluginProps`:
  `{ code: string; handleExecuteRef: React.MutableRefObject<((code:string)=>Promise<any>) | null>; providerId?: string; modelType: string; token?: string; schema: string; containerWidth?: number }`.
  It assigns `handleExecuteRef.current` to a function that runs `RawExecuteDocument` and returns `data.RawExecute` (or null). Render it, then call `handleExecuteRef.current(code)` to execute.
- Destructive check: `isDestructiveQuery(code)` from `src/utils/query-utils.ts`.

**Editor**:
- `CodeEditor` (`src/components/editor.tsx`), props `{ value: string; setValue?: (v:string)=>void; language?: string; onRun?: (lineText?: string)=>void; defaultShowPreview?: boolean; disabled?: boolean }`. `onRun` receives the selected text if there is a selection, else the whole doc. Ctrl/Cmd+Enter triggers `onRun`.

**Chat**:
- `ChatPage` (`src/pages/chat/chat.tsx`), `FC` with no props. Wraps content in `<InternalPage routes={[InternalRoutes.Chat]} sidebar={<ChatHistorySidebar />}>` then `<div className="flex flex-col w-full h-full gap-2 min-w-[30%]">…</div>`.
- `useAI()` (`src/components/ai.tsx`) returns `{ modelType?: IAIModelType, currentModel?: string, models: string[], ... }`. `IAIModelType = { id, modelType, name?, token?, ... }`.
- Source ref: `buildSourceScopeRef(item, profile, schema?)` from `src/utils/source-refs.ts`.
- Streaming endpoint `POST /api/ai-chat/stream`; mutations `ExecuteConfirmedSqlDocument`, `GenerateChatTitleDocument`.
- Chat currently has a **"Move to Scratchpad"** action (locale key `moveToScratchpad`) that dispatches `ScratchpadActions`. This must be re-pointed at the new slice.

**Routes** (`src/config/routes.tsx`):
- `InternalRoutes.RawExecute = { name:"Scratchpad", path:"/scratchpad", component: <SourceSurfaceRoute surface="scratchpad" component={<LazyRoute component={RawExecutePage}/>} /> }`.
- `InternalRoutes.Chat = { name:"Chat", path:"/chat", component:<ChatRouteComponent/> }`, where `ChatRouteComponent` checks `getComponent('sql-agent')` else renders `SourceSurfaceRoute surface="chat"`.
- `RawExecutePage` lazy-imported from `../pages/raw-execute/raw-execute`.

**Sidebar nav** (`src/components/sidebar/sidebar.tsx`):
- Chat entry added via `routes.unshift({ title: t('chat'), icon: <SparklesIcon/>, path: InternalRoutes.Chat.path })` guarded by `supportsChat`.

**Locale**: `src/locales/pages/raw-execute.yaml` — **edit `en_US` block only** (lines 1-26). Namespace `pages/raw-execute`. Chat namespace `pages/chat` (`src/locales/pages/chat.yaml`).

---

## File Structure

**New files:**
- `src/store/sql-editor.ts` — tabs slice (`ISqlEditorState`, `SqlEditorActions`, `sqlEditorReducers`).
- `src/pages/raw-execute/sql-editor-layout.tsx` — three-panel resizable shell.
- `src/pages/raw-execute/source-selectors.tsx` — profile + database dropdowns.
- `src/pages/raw-execute/object-tree.tsx` — DB object tree (left panel below selectors).
- `src/pages/raw-execute/editor-tabs.tsx` — tab bar.
- `src/pages/raw-execute/editor-toolbar.tsx` — Run + Format toolbar.
- `src/pages/raw-execute/sql-tab.tsx` — one SQL editor tab (editor + status bar + results + destructive confirm).
- `src/pages/raw-execute/structure-tab.tsx` — read-only table structure panel.
- `src/pages/raw-execute/chat-panel.tsx` — embeddable chat (extracted ChatPage core).
- `src/utils/format-sql.ts` — `sql-formatter` wrapper.

**Modified files:**
- `src/store/index.ts` — swap `scratchpad` registration for `sqlEditor`; remove scratchpad cleanup/transform.
- `src/pages/raw-execute/raw-execute.tsx` — rewritten to compose the new page.
- `src/pages/chat/chat.tsx` — extract core into `chat-panel.tsx`; re-point "Move to Scratchpad".
- `src/config/routes.tsx` — render editor outside `InternalPage`; remove `/chat` route.
- `src/components/sidebar/sidebar.tsx` — remove Chat nav entry.
- `src/locales/pages/raw-execute.yaml` — new `en_US` keys; drop obsolete cell keys.
- `src/pages/raw-execute/query-view.tsx` — unchanged (reused as-is).
- `e2e/tests/features/scratchpad.spec.mjs`, `e2e/support/whodb/scratchpad.mjs` — updated for new UI.

**Removed:**
- `src/store/scratchpad.ts`.

---

## Task 1: Add the `sql-formatter` dependency and a wrapper

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/utils/format-sql.ts`

- [ ] **Step 1: Install the dependency**

Run from `frontend/`:
```bash
pnpm add sql-formatter
```
Expected: `package.json` gains `"sql-formatter": "^15.x"` under dependencies; `pnpm-lock.yaml` updates.

- [ ] **Step 2: Create the formatter wrapper**

Create `frontend/src/utils/format-sql.ts`:
```typescript
import { format } from 'sql-formatter';

/** Maps a WhoDB source type to a sql-formatter dialect. Falls back to the generic 'sql' dialect. */
function dialectFor(sourceType: string | undefined): string {
  switch ((sourceType ?? '').toLowerCase()) {
    case 'postgres':
    case 'cockroachdb':
    case 'yugabytedb':
    case 'questdb':
      return 'postgresql';
    case 'mysql':
    case 'mariadb':
    case 'tidb':
      return 'mysql';
    case 'sqlite3':
    case 'duckdb':
      return 'sqlite';
    case 'clickhouse':
      return 'sql';
    default:
      return 'sql';
  }
}

/**
 * Pretty-prints a SQL string for the given source type. Returns the original
 * string unchanged if the formatter throws (e.g. on unsupported syntax).
 */
export function formatSql(code: string, sourceType: string | undefined): string {
  try {
    return format(code, { language: dialectFor(sourceType) as any });
  } catch {
    return code;
  }
}
```

- [ ] **Step 3: Verify typecheck passes**

Run from `frontend/`:
```bash
pnpm run typecheck
```
Expected: PASS (no errors referencing `format-sql.ts` or `sql-formatter`).

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/src/utils/format-sql.ts
git commit -m "feat(sql-editor): add sql-formatter dependency and dialect-aware wrapper"
```

---

## Task 2: Create the `sql-editor` Redux slice

Replaces the multi-cell `scratchpad` slice with a tabs model.

**Files:**
- Create: `frontend/src/store/sql-editor.ts`

- [ ] **Step 1: Write the slice**

Create `frontend/src/store/sql-editor.ts`:
```typescript
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { SourceObjectRefInput } from '@graphql';
import { v4 as uuidv4 } from 'uuid';

export type SqlEditorTabKind = 'sql' | 'structure';

export type SqlEditorTab = {
  id: string;
  name: string;
  kind: SqlEditorTabKind;
  /** SQL source — present for kind === 'sql'. */
  code?: string;
  /** Target object ref — present for kind === 'structure'. */
  target?: SourceObjectRefInput;
};

export type ISqlEditorState = {
  tabs: SqlEditorTab[];
  activeTabId: string | null;
};

const initialState: ISqlEditorState = {
  tabs: [],
  activeTabId: null,
};

/** Number of SQL tabs, for naming the next "SQL N" tab. */
function nextSqlTabName(state: ISqlEditorState): string {
  const count = state.tabs.filter(tab => tab.kind === 'sql').length;
  return `SQL ${count + 1}`;
}

export const sqlEditorSlice = createSlice({
  name: 'sqlEditor',
  initialState,
  reducers: {
    /** Ensures at least one SQL tab exists and an active tab is set. Safe to call on every mount. */
    ensureTab: (state) => {
      if (state.tabs.length === 0) {
        const id = uuidv4();
        state.tabs.push({ id, name: 'SQL 1', kind: 'sql', code: '' });
        state.activeTabId = id;
      } else if (!state.activeTabId || !state.tabs.some(t => t.id === state.activeTabId)) {
        state.activeTabId = state.tabs[0].id;
      }
    },
    addSqlTab: (state, action: PayloadAction<{ name?: string; code?: string } | undefined>) => {
      const id = uuidv4();
      state.tabs.push({
        id,
        name: action.payload?.name ?? nextSqlTabName(state),
        kind: 'sql',
        code: action.payload?.code ?? '',
      });
      state.activeTabId = id;
    },
    openStructureTab: (state, action: PayloadAction<{ name: string; target: SourceObjectRefInput }>) => {
      // If a structure tab for this target is already open, just activate it.
      const existing = state.tabs.find(
        t => t.kind === 'structure' && t.target?.Locator === action.payload.target.Locator
          && JSON.stringify(t.target?.Path) === JSON.stringify(action.payload.target.Path),
      );
      if (existing) {
        state.activeTabId = existing.id;
        return;
      }
      const id = uuidv4();
      state.tabs.push({ id, name: action.payload.name, kind: 'structure', target: action.payload.target });
      state.activeTabId = id;
    },
    closeTab: (state, action: PayloadAction<{ tabId: string }>) => {
      if (state.tabs.length <= 1) return;
      const index = state.tabs.findIndex(t => t.id === action.payload.tabId);
      if (index === -1) return;
      state.tabs.splice(index, 1);
      if (state.activeTabId === action.payload.tabId) {
        state.activeTabId = state.tabs[Math.max(0, index - 1)].id;
      }
    },
    renameTab: (state, action: PayloadAction<{ tabId: string; name: string }>) => {
      const tab = state.tabs.find(t => t.id === action.payload.tabId);
      if (tab) tab.name = action.payload.name;
    },
    updateTabCode: (state, action: PayloadAction<{ tabId: string; code: string }>) => {
      const tab = state.tabs.find(t => t.id === action.payload.tabId);
      if (tab && tab.kind === 'sql') tab.code = action.payload.code;
    },
    setActiveTab: (state, action: PayloadAction<{ tabId: string }>) => {
      if (state.tabs.some(t => t.id === action.payload.tabId)) {
        state.activeTabId = action.payload.tabId;
      }
    },
  },
});

export const SqlEditorActions = sqlEditorSlice.actions;
export const sqlEditorReducers = sqlEditorSlice.reducer;
```

- [ ] **Step 2: Verify typecheck passes**

Run from `frontend/`:
```bash
pnpm run typecheck
```
Expected: PASS. (`SourceObjectRefInput` resolves from the `@graphql` alias; `scratchpad.ts` still exists so the store is unaffected.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/sql-editor.ts
git commit -m "feat(sql-editor): add tabs redux slice"
```

---

## Task 3: Register the slice in the store and remove the scratchpad slice

**Files:**
- Modify: `frontend/src/store/index.ts`
- Delete: `frontend/src/store/scratchpad.ts`

- [ ] **Step 1: Update imports in `store/index.ts`**

Replace:
```typescript
import type { IScratchpadState } from './scratchpad';
import { scratchpadReducers } from './scratchpad';
```
with:
```typescript
import { sqlEditorReducers } from './sql-editor';
```

- [ ] **Step 2: Remove the scratchpad localStorage-cleanup block**

Delete the entire `if (typeof window !== 'undefined') { ... }` block that reads `localStorage.getItem('persist:scratchpad')` (lines ~38-65, the comment starts with "Clear any corrupted scratchpad data on startup").

- [ ] **Step 3: Remove the `scratchpadTransform`**

Delete the entire `const scratchpadTransform = createTransform(...)` declaration (lines ~67-115).

- [ ] **Step 4: Swap the reducer registration**

In `ceReducerMap`, replace:
```typescript
  scratchpad: persistReducer({ key: "scratchpad", storage, transforms: [scratchpadTransform], throttle: PERSIST_THROTTLE }, scratchpadReducers),
```
with:
```typescript
  sqlEditor: persistReducer({ key: "sqlEditor", storage, throttle: PERSIST_THROTTLE }, sqlEditorReducers),
```

- [ ] **Step 5: Delete the old slice file**

```bash
git rm frontend/src/store/scratchpad.ts
```

- [ ] **Step 6: Verify typecheck — expect failures pointing to remaining `scratchpad` references**

Run from `frontend/`:
```bash
pnpm run typecheck
```
Expected: errors in `src/pages/raw-execute/raw-execute.tsx` and `src/pages/chat/chat.tsx` (they still import `ScratchpadActions` / read `state.scratchpad`). These are fixed in Tasks 11 and 12. Do not fix unrelated files. If errors appear in any *other* file, note them — they indicate an extra consumer to migrate.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/store/index.ts frontend/src/store/scratchpad.ts
git commit -m "feat(sql-editor): register sqlEditor slice, remove scratchpad slice"
```

---

## Task 4: Three-panel resizable layout shell

A presentational shell: left (fixed-width, resizable), center (flex), right (collapsible, resizable). No data logic.

**Files:**
- Create: `frontend/src/pages/raw-execute/sql-editor-layout.tsx`

- [ ] **Step 1: Write the layout component**

Create `frontend/src/pages/raw-execute/sql-editor-layout.tsx`:
```tsx
import type { FC, ReactNode } from "react";
import { useState, useCallback } from "react";

const LEFT_DEFAULT = 220;
const LEFT_MIN = 160;
const LEFT_MAX = 420;
const RIGHT_DEFAULT = 360;
const RIGHT_MIN = 280;
const RIGHT_MAX = 640;

type ISqlEditorLayoutProps = {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  rightCollapsed: boolean;
  onToggleRight: () => void;
};

/** Full-viewport three-column shell with draggable dividers between panels. */
export const SqlEditorLayout: FC<ISqlEditorLayoutProps> = ({ left, center, right, rightCollapsed, onToggleRight }) => {
  const [leftWidth, setLeftWidth] = useState(LEFT_DEFAULT);
  const [rightWidth, setRightWidth] = useState(RIGHT_DEFAULT);

  const startDrag = useCallback((edge: "left" | "right") => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startLeft = leftWidth;
    const startRight = rightWidth;
    const onMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      if (edge === "left") {
        setLeftWidth(Math.min(LEFT_MAX, Math.max(LEFT_MIN, startLeft + dx)));
      } else {
        setRightWidth(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, startRight - dx)));
      }
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.removeEventListener("mousemove", onMove); // guard against duplicate listeners
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [leftWidth, rightWidth]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#0a0a0a]" data-testid="sql-editor-layout">
      <div style={{ width: leftWidth }} className="flex-shrink-0 h-full overflow-hidden border-r border-neutral-200 dark:border-neutral-800">
        {left}
      </div>
      <div onMouseDown={startDrag("left")} className="w-1 cursor-col-resize hover:bg-blue-400/40 flex-shrink-0" data-testid="sql-editor-left-divider" />
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {center}
      </div>
      {!rightCollapsed && (
        <>
          <div onMouseDown={startDrag("right")} className="w-1 cursor-col-resize hover:bg-blue-400/40 flex-shrink-0" data-testid="sql-editor-right-divider" />
          <div style={{ width: rightWidth }} className="flex-shrink-0 h-full overflow-hidden border-l border-neutral-200 dark:border-neutral-800">
            {right}
          </div>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify typecheck + lint**

Run from `frontend/`:
```bash
pnpm run typecheck && pnpm run lint
```
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/raw-execute/sql-editor-layout.tsx
git commit -m "feat(sql-editor): three-panel resizable layout shell"
```

---

## Task 5: Source selectors (profile + database)

**Files:**
- Create: `frontend/src/pages/raw-execute/source-selectors.tsx`

- [ ] **Step 1: Confirm the profile-switch helper name**

Run from `frontend/`:
```bash
grep -n "switchProfile\|useSwitchProfile\|switchProfile(" src/components/sidebar/sidebar.tsx | head
```
Expected: shows how `switchProfile` is obtained (a hook like `const { switchProfile } = useProfileSwitch()` or a direct import). Use the SAME import/hook in this component. The steps below assume a hook `useProfileSwitch()` returning `{ switchProfile }`; if the grep shows a different name, substitute it consistently.

- [ ] **Step 2: Write the component**

Create `frontend/src/pages/raw-execute/source-selectors.tsx`:
```tsx
import type { FC } from "react";
import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { skipToken } from "@apollo/client";
import { SearchSelect } from "@clidey/ux"; // match sidebar's import for SearchSelect
import { SourceFieldOptionsDocument } from "../../generated/graphql";
import { useAppSelector } from "../../store/hooks";
import { useSourceContract } from "../../hooks/useSourceContract";
import { useProfileSwitch } from "../../components/sidebar/sidebar"; // adjust to the real export (Step 1)

/** Profile + database dropdowns for the SQL editor's left panel header. */
export const SourceSelectors: FC = () => {
  const current = useAppSelector(state => state.auth.current);
  const profiles = useAppSelector(state => state.auth.profiles);
  const { supportsDatabaseSwitching } = useSourceContract(current?.Type);
  const { switchProfile } = useProfileSwitch();

  const databaseQueryOptions = current != null && supportsDatabaseSwitching && current.Type
    ? { variables: { sourceType: current.Type } }
    : skipToken;
  const { data: availableDatabases, loading: databasesLoading } = useQuery(SourceFieldOptionsDocument, databaseQueryOptions);

  const profileOptions = useMemo(
    () => profiles.map(p => ({ value: p.Id, label: p.DisplayName ?? `${p.Type} · ${p.Hostname}` })),
    [profiles],
  );
  const databaseOptions = useMemo(
    () => (availableDatabases?.SourceFieldOptions ?? []).map(db => ({ value: db, label: db })),
    [availableDatabases],
  );

  return (
    <div className="flex flex-col gap-2 p-2 border-b border-neutral-200 dark:border-neutral-800" data-testid="sql-editor-source-selectors">
      <SearchSelect
        options={profileOptions}
        value={current?.Id}
        onChange={(id: string) => { const p = profiles.find(x => x.Id === id); if (p) void switchProfile(p); }}
      />
      {supportsDatabaseSwitching && (
        <SearchSelect
          options={databaseOptions}
          value={current?.Database}
          disabled={databasesLoading}
          onChange={(db: string) => { if (current?.Id && db) void switchProfile(current, db); }}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 3: Verify typecheck + lint**

Run from `frontend/`:
```bash
pnpm run typecheck && pnpm run lint
```
Expected: PASS. If `SearchSelect` import path differs, copy it verbatim from `sidebar.tsx`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/raw-execute/source-selectors.tsx
git commit -m "feat(sql-editor): profile + database source selectors"
```

---

## Task 6: DB object tree

**Files:**
- Create: `frontend/src/pages/raw-execute/object-tree.tsx`

- [ ] **Step 1: Write the tree component**

Create `frontend/src/pages/raw-execute/object-tree.tsx`. It fetches objects via `GetStorageUnitsDocument`, groups by `Kind`, renders collapsible groups with counts and a search box, and exposes two callbacks: `onSelectObject(obj)` (single-click) and `onOpenStructure(obj)` (double-click).
```tsx
import type { FC } from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { skipToken } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { ChevronRightIcon, ChevronDownIcon } from "../../components/heroicons";
import { GetStorageUnitsDocument } from "../../generated/graphql";
import type { SourceObject } from "../../generated/graphql";
import { useAppSelector } from "../../store/hooks";
import { useSourceContract } from "../../hooks/useSourceContract";
import { buildSourceSchemaQuery } from "../../utils/source-refs";

type IObjectTreeProps = {
  onSelectObject: (obj: SourceObject) => void;
  onOpenStructure: (obj: SourceObject) => void;
};

/** Left-panel tree of schema objects grouped by Kind. Single-click selects, double-click opens structure. */
export const ObjectTree: FC<IObjectTreeProps> = ({ onSelectObject, onOpenStructure }) => {
  const { t } = useTranslation("pages/raw-execute");
  const current = useAppSelector(state => state.auth.current);
  const schema = useAppSelector(state => state.database.schema);
  const { item } = useSourceContract(current?.Type);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Reuse the same parent-ref construction the sidebar/storage-unit pages use.
  const queryVars = useMemo(() => buildSourceSchemaQuery(item, current), [item, current]);
  const { data } = useQuery(GetStorageUnitsDocument, current != null ? { variables: { parent: queryVars?.parent } } : skipToken);

  const groups = useMemo(() => {
    const objs = (data?.StorageUnit ?? []).filter(o => o.Name.toLowerCase().includes(search.toLowerCase()));
    const byKind: Record<string, SourceObject[]> = {};
    for (const o of objs) (byKind[o.Kind] ??= []).push(o);
    return byKind;
  }, [data, search]);

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="sql-editor-object-tree">
      <div className="px-2 py-1 text-xs font-bold uppercase text-neutral-500">{schema || t("schemaHeader")}</div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t("searchObjects")}
        className="mx-2 mb-2 px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-transparent"
        data-testid="sql-editor-tree-search"
      />
      <div className="flex-1 overflow-auto px-1">
        {Object.entries(groups).map(([kind, objs]) => (
          <div key={kind}>
            <button
              className="flex items-center gap-1 w-full px-1 py-1 text-xs uppercase font-semibold text-neutral-500"
              onClick={() => setCollapsed(c => ({ ...c, [kind]: !c[kind] }))}
            >
              {collapsed[kind] ? <ChevronRightIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
              <span>{kind}</span>
              <span className="ml-auto rounded-full bg-neutral-200 dark:bg-neutral-800 px-2">{objs.length}</span>
            </button>
            {!collapsed[kind] && objs.map(obj => (
              <button
                key={obj.Ref.Locator + obj.Name}
                className="block w-full text-left pl-5 pr-2 py-0.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded"
                onClick={() => onSelectObject(obj)}
                onDoubleClick={() => onOpenStructure(obj)}
                data-testid={`sql-editor-tree-object-${obj.Name}`}
              >
                {obj.Name}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Confirm `buildSourceSchemaQuery` shape**

Run from `frontend/`:
```bash
grep -n "export function buildSourceSchemaQuery\|export const buildSourceSchemaQuery" src/utils/source-refs.ts
```
Expected: a function returning an object containing `parent` (a `SourceObjectRefInput`). If it returns the variables under a different key, adjust the `variables` mapping in Step 1 to match. If `ChevronDownIcon` is not exported from `components/heroicons`, run `grep -n "Chevron" src/components/heroicons*` and use the available names.

- [ ] **Step 3: Verify typecheck + lint**

Run from `frontend/`:
```bash
pnpm run typecheck && pnpm run lint
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/raw-execute/object-tree.tsx
git commit -m "feat(sql-editor): DB object tree with grouped collapsible objects"
```

---

## Task 7: Editor tabs bar

**Files:**
- Create: `frontend/src/pages/raw-execute/editor-tabs.tsx`

- [ ] **Step 1: Write the tabs bar**

Create `frontend/src/pages/raw-execute/editor-tabs.tsx`. Reads tabs from the slice, renders each tab (with ✕), a `+` button, and the chat toggle on the far right. Rename on double-click for SQL tabs.
```tsx
import type { FC } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon, PlusIcon } from "../../components/heroicons";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { SqlEditorActions } from "../../store/sql-editor";

type IEditorTabsProps = {
  rightCollapsed: boolean;
  onToggleRight: () => void;
};

/** Tab strip for the SQL editor. */
export const EditorTabs: FC<IEditorTabsProps> = ({ rightCollapsed, onToggleRight }) => {
  const { t } = useTranslation("pages/raw-execute");
  const dispatch = useAppDispatch();
  const tabs = useAppSelector(state => state.sqlEditor.tabs);
  const activeTabId = useAppSelector(state => state.sqlEditor.activeTabId);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex items-stretch h-9 border-b border-neutral-200 dark:border-neutral-800 px-1 gap-1" data-testid="sql-editor-tabs">
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => dispatch(SqlEditorActions.setActiveTab({ tabId: tab.id }))}
          onDoubleClick={() => tab.kind === "sql" && setEditingId(tab.id)}
          className={`flex items-center gap-1 px-3 text-xs cursor-pointer rounded-t ${tab.id === activeTabId ? "bg-neutral-100 dark:bg-neutral-900 font-semibold" : "text-neutral-500"}`}
          data-testid={`sql-editor-tab-${tab.name}`}
        >
          {editingId === tab.id ? (
            <input
              autoFocus
              defaultValue={tab.name}
              onBlur={e => { dispatch(SqlEditorActions.renameTab({ tabId: tab.id, name: e.target.value || tab.name })); setEditingId(null); }}
              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              className="bg-transparent w-20 text-xs"
            />
          ) : (
            <span>{tab.name}</span>
          )}
          {tabs.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); dispatch(SqlEditorActions.closeTab({ tabId: tab.id })); }}
              aria-label={t("closeTab")}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      <button onClick={() => dispatch(SqlEditorActions.addSqlTab())} aria-label={t("addTab")} className="px-2 text-neutral-500" data-testid="sql-editor-add-tab">
        <PlusIcon className="w-4 h-4" />
      </button>
      <div className="flex-1" />
      <button onClick={onToggleRight} aria-label={t("toggleChat")} className="px-2 text-neutral-500" data-testid="sql-editor-toggle-chat">
        {rightCollapsed ? t("showChat") : t("hideChat")}
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Confirm icon exports**

Run from `frontend/`:
```bash
grep -n "XMarkIcon\|PlusIcon" src/components/heroicons.tsx
```
Expected: both exported. If named differently, substitute.

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm run typecheck && pnpm run lint
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/raw-execute/editor-tabs.tsx
git commit -m "feat(sql-editor): tab strip with add/close/rename and chat toggle"
```

---

## Task 8: Editor toolbar (Run + Format)

**Files:**
- Create: `frontend/src/pages/raw-execute/editor-toolbar.tsx`

- [ ] **Step 1: Write the toolbar**

Create `frontend/src/pages/raw-execute/editor-toolbar.tsx`:
```tsx
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { PlayIcon } from "../../components/heroicons";

type IEditorToolbarProps = {
  onRun: () => void;
  onFormat: () => void;
};

/** Run + Format toolbar for SQL tabs. */
export const EditorToolbar: FC<IEditorToolbarProps> = ({ onRun, onFormat }) => {
  const { t } = useTranslation("pages/raw-execute");
  return (
    <div className="flex items-center gap-2 px-2 py-1 border-b border-neutral-200 dark:border-neutral-800" data-testid="sql-editor-toolbar">
      <button onClick={onRun} className="px-3 py-1 text-xs rounded bg-blue-600 text-white flex items-center gap-1" data-testid="sql-editor-run">
        <PlayIcon className="w-3 h-3" /> {t("run")}
      </button>
      <button onClick={onFormat} className="px-3 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-800" data-testid="sql-editor-format">
        {t("format")}
      </button>
    </div>
  );
};
```

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm run typecheck && pnpm run lint
```
Expected: PASS (confirm `PlayIcon` export; substitute if needed).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/raw-execute/editor-toolbar.tsx
git commit -m "feat(sql-editor): Run + Format toolbar"
```

---

## Task 9: SQL tab (editor + status bar + results + destructive confirm)

Wires `CodeEditor`, the toolbar, `QueryView`, and the destructive-query `AlertDialog` for one SQL tab.

**Files:**
- Create: `frontend/src/pages/raw-execute/sql-tab.tsx`

- [ ] **Step 1: Write the SQL tab**

Create `frontend/src/pages/raw-execute/sql-tab.tsx`:
```tsx
import type { FC } from "react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertDialog } from "@clidey/ux"; // match the import used in raw-execute.tsx today
import { CodeEditor } from "../../components/editor";
import { QueryView } from "./query-view";
import { EditorToolbar } from "./editor-toolbar";
import { formatSql } from "../../utils/format-sql";
import { isDestructiveQuery } from "../../utils/query-utils";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { SqlEditorActions } from "../../store/sql-editor";
import { useAI } from "../../components/ai";

type ISqlTabProps = { tabId: string };

/** A single SQL editor tab: code editor on top, results below, with destructive-query confirmation. */
export const SqlTab: FC<ISqlTabProps> = ({ tabId }) => {
  const { t } = useTranslation("pages/raw-execute");
  const dispatch = useAppDispatch();
  const code = useAppSelector(state => state.sqlEditor.tabs.find(tab => tab.id === tabId)?.code ?? "");
  const currentType = useAppSelector(state => state.auth.current?.Type);
  const currentDatabase = useAppSelector(state => state.auth.current?.Database);
  const currentId = useAppSelector(state => state.auth.current?.Id);
  const { modelType } = useAI();

  const handleExecuteRef = useRef<((code: string) => Promise<any>) | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0); // forces QueryView remount/refetch on demand

  const setCode = useCallback((value: string) => dispatch(SqlEditorActions.updateTabCode({ tabId, code: value })), [dispatch, tabId]);

  const doExecute = useCallback((sql: string) => {
    handleExecuteRef.current?.(sql).then(() => setRunKey(k => k + 1)).catch(() => setRunKey(k => k + 1));
  }, []);

  const onRun = useCallback((sql?: string) => {
    const target = (sql ?? code).trim();
    if (!target) return;
    if (isDestructiveQuery(target)) {
      setPendingCode(target);
    } else {
      doExecute(target);
    }
  }, [code, doExecute]);

  const onFormat = useCallback(() => setCode(formatSql(code, currentType)), [code, currentType, setCode]);

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="sql-editor-sql-tab">
      <EditorToolbar onRun={() => onRun()} onFormat={onFormat} />
      <div className="flex-1 min-h-0 overflow-auto">
        <CodeEditor language="sql" value={code} setValue={setCode} onRun={(lineText) => onRun(lineText)} />
      </div>
      <div className="px-2 py-0.5 text-[10px] text-neutral-500 border-t border-neutral-200 dark:border-neutral-800">
        {t("searchPath", { schema: currentDatabase ?? "" })}
      </div>
      <div className="h-1 bg-neutral-200 dark:bg-neutral-800 cursor-row-resize flex-shrink-0" data-testid="sql-editor-results-divider" />
      <div className="h-[40%] overflow-auto border-t border-neutral-200 dark:border-neutral-800">
        <QueryView
          key={runKey}
          code={code}
          handleExecuteRef={handleExecuteRef}
          modelType={modelType?.modelType ?? ""}
          schema={currentDatabase ?? ""}
          token={modelType?.token}
          providerId={currentId}
        />
      </div>
      {pendingCode != null && (
        <AlertDialog
          /* match the prop names AlertDialog uses in raw-execute.tsx today */
          title={t("confirmExecutionTitle")}
          description={t("confirmExecutionDescription")}
          onConfirm={() => { const c = pendingCode; setPendingCode(null); if (c) doExecute(c); }}
          onCancel={() => setPendingCode(null)}
        />
      )}
    </div>
  );
};
```

- [ ] **Step 2: Align `AlertDialog` usage with the current page**

Run from `frontend/`:
```bash
grep -n "AlertDialog" src/pages/raw-execute/raw-execute.tsx
```
Expected: shows the exact import and prop API (title/description/confirm/cancel labels and callbacks). Match those prop names exactly in Step 1 — replace the placeholder props if they differ. Also confirm `QueryView`'s execute returns a promise you can `.then()` (it does — see Reference).

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm run typecheck && pnpm run lint
```
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/raw-execute/sql-tab.tsx
git commit -m "feat(sql-editor): SQL tab wiring editor, results, format, destructive confirm"
```

---

## Task 10: Table structure panel (structure tab)

**Files:**
- Create: `frontend/src/pages/raw-execute/structure-tab.tsx`

- [ ] **Step 1: Write the structure panel**

Create `frontend/src/pages/raw-execute/structure-tab.tsx`. Fetches `SourceFieldConstraintsDocument` for the tab's `target` ref and renders a read-only columns table (name, type, nullable, default, key flags).
```tsx
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@apollo/client/react";
import { skipToken } from "@apollo/client";
import { SourceFieldConstraintsDocument } from "../../generated/graphql";
import { useAppSelector } from "../../store/hooks";

type IStructureTabProps = { tabId: string };

/** Read-only table structure view: columns, types, nullability, defaults, and keys. */
export const StructureTab: FC<IStructureTabProps> = ({ tabId }) => {
  const { t } = useTranslation("pages/raw-execute");
  const target = useAppSelector(state => state.sqlEditor.tabs.find(tab => tab.id === tabId)?.target);
  const { data, loading } = useQuery(SourceFieldConstraintsDocument, target ? { variables: { ref: target } } : skipToken);

  if (loading) return <div className="p-4 text-xs text-neutral-500">{t("loading")}</div>;
  const columns = data?.SourceFieldConstraints ?? [];

  return (
    <div className="h-full overflow-auto p-2" data-testid="sql-editor-structure-tab">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="px-2 py-1">{t("colName")}</th>
            <th className="px-2 py-1">{t("colType")}</th>
            <th className="px-2 py-1">{t("colNullable")}</th>
            <th className="px-2 py-1">{t("colDefault")}</th>
            <th className="px-2 py-1">{t("colKey")}</th>
          </tr>
        </thead>
        <tbody>
          {columns.map(col => (
            <tr key={col.Name} className="border-t border-neutral-100 dark:border-neutral-900">
              <td className="px-2 py-1 font-mono">{col.Name}</td>
              <td className="px-2 py-1">{col.Type}</td>
              <td className="px-2 py-1">{col.Nullable ? t("yes") : t("no")}</td>
              <td className="px-2 py-1">{col.DefaultValue ?? ""}</td>
              <td className="px-2 py-1">
                {col.Primary ? t("keyPrimary") : col.ForeignKey ? `${t("keyForeign")} → ${col.ForeignKey.Table}.${col.ForeignKey.Column}` : col.Unique ? t("keyUnique") : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

- [ ] **Step 2: Verify typecheck + lint**

```bash
pnpm run typecheck && pnpm run lint
```
Expected: PASS. (`SourceFieldConstraintsDocument` and its result fields exist in generated types per Reference.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/raw-execute/structure-tab.tsx
git commit -m "feat(sql-editor): read-only table structure tab"
```

---

## Task 11: Extract the embeddable chat panel

Extract `ChatPage`'s core (everything inside its `<InternalPage>` wrapper) into `chat-panel.tsx` that renders standalone in a sized container, and re-point its "Move to Scratchpad" action at `SqlEditorActions`.

**Files:**
- Create: `frontend/src/pages/raw-execute/chat-panel.tsx`
- Modify: `frontend/src/pages/chat/chat.tsx`

- [ ] **Step 1: Read the full ChatPage to identify the extraction boundary**

Run from `frontend/`:
```bash
sed -n '1,80p' src/pages/chat/chat.tsx && grep -n "InternalPage\|ScratchpadActions\|moveToScratchpad\|return (" src/pages/chat/chat.tsx
```
Expected: identifies (a) the JSX boundary where `<InternalPage>` wraps the inner `<div className="flex flex-col w-full h-full gap-2 ...">`, and (b) every `ScratchpadActions` usage (the "Move to Scratchpad" handler).

- [ ] **Step 2: Create `chat-panel.tsx` exporting the inner content as `ChatPanel`**

Move the chat body (state, hooks, handlers, and the inner `<div className="flex flex-col w-full h-full …">…</div>` JSX) into a new `export const ChatPanel: FC` in `frontend/src/pages/raw-execute/chat-panel.tsx`. Do **not** include `<InternalPage>` or `<ChatHistorySidebar>`. Keep all existing imports it needs (`useAI`, `buildSourceScopeRef`, the streaming `fetch`, `ExecuteConfirmedSqlDocument`, `GenerateChatTitleDocument`, `useTranslation("pages/chat")`). Replace the "Move to Scratchpad" handler's `dispatch(ScratchpadActions.addPage({ initialQuery: sql }))` (or equivalent) with:
```typescript
dispatch(SqlEditorActions.addSqlTab({ code: sql }));
```
adding `import { SqlEditorActions } from "../../store/sql-editor";`.

(Exact original lines come from Step 1; reproduce the body verbatim, changing only the wrapper removal and the scratchpad dispatch.)

- [ ] **Step 3: Rewrite `chat.tsx`'s `ChatPage` to wrap `ChatPanel`**

`ChatPage` becomes a thin wrapper preserved for any remaining internal references (it will no longer be routed after Task 13, but keep it compiling):
```tsx
import { ChatPanel } from "../raw-execute/chat-panel";
// ...
export const ChatPage: FC = () => (
  <div className="flex flex-col w-full h-full gap-2 min-w-[30%]">
    <ChatPanel />
  </div>
);
```
Remove now-unused imports from `chat.tsx` (the ones moved to `chat-panel.tsx`).

- [ ] **Step 4: Verify typecheck + lint**

```bash
pnpm run typecheck && pnpm run lint
```
Expected: PASS. `chat.tsx` no longer references `ScratchpadActions` or `state.scratchpad`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/raw-execute/chat-panel.tsx frontend/src/pages/chat/chat.tsx
git commit -m "feat(sql-editor): extract embeddable ChatPanel, retarget move-to-editor"
```

---

## Task 12: Rewrite the page and compose everything

**Files:**
- Modify (full rewrite): `frontend/src/pages/raw-execute/raw-execute.tsx`

- [ ] **Step 1: Rewrite `raw-execute.tsx`**

Replace the file's component body with the composed editor. Keep the existing `registerRawExecuteExtensions` export ONLY if other code imports it — check first:
```bash
grep -rn "registerRawExecuteExtensions" frontend/src --include=*.ts --include=*.tsx | grep -v "raw-execute.tsx"
```
If there are no other importers, drop it. If there are (e.g. EE), keep the export as a no-op-compatible stub with the same signature.

New `raw-execute.tsx`:
```tsx
import type { FC } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "../../components/heroicons";
import { InternalRoutes } from "../../config/routes";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { SqlEditorActions } from "../../store/sql-editor";
import { SqlEditorLayout } from "./sql-editor-layout";
import { SourceSelectors } from "./source-selectors";
import { ObjectTree } from "./object-tree";
import { EditorTabs } from "./editor-tabs";
import { SqlTab } from "./sql-tab";
import { StructureTab } from "./structure-tab";
import { ChatPanel } from "./chat-panel";

export const RawExecutePage: FC = () => {
  const { t } = useTranslation("pages/raw-execute");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const tabs = useAppSelector(state => state.sqlEditor.tabs);
  const activeTabId = useAppSelector(state => state.sqlEditor.activeTabId);
  const [rightCollapsed, setRightCollapsed] = useState(true); // collapsed by default

  useEffect(() => { dispatch(SqlEditorActions.ensureTab()); }, [dispatch]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const left = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-neutral-200 dark:border-neutral-800">
        <button onClick={() => navigate(InternalRoutes.Dashboard.StorageUnit.path)} aria-label={t("back")} data-testid="sql-editor-back">
          <ArrowLeftIcon className="w-4 h-4" />
        </button>
      </div>
      <SourceSelectors />
      <div className="flex-1 min-h-0">
        <ObjectTree
          onSelectObject={obj => dispatch(SqlEditorActions.addSqlTab({ name: obj.Name, code: `SELECT * FROM ${obj.Name} LIMIT 100;` }))}
          onOpenStructure={obj => dispatch(SqlEditorActions.openStructureTab({ name: obj.Name, target: { Kind: obj.Ref.Kind, Locator: obj.Ref.Locator, Path: obj.Ref.Path } }))}
        />
      </div>
    </div>
  );

  const center = (
    <div className="flex flex-col h-full">
      <EditorTabs rightCollapsed={rightCollapsed} onToggleRight={() => setRightCollapsed(c => !c)} />
      <div className="flex-1 min-h-0">
        {activeTab?.kind === "structure"
          ? <StructureTab key={activeTab.id} tabId={activeTab.id} />
          : activeTab
            ? <SqlTab key={activeTab.id} tabId={activeTab.id} />
            : null}
      </div>
    </div>
  );

  return (
    <SqlEditorLayout
      left={left}
      center={center}
      right={<ChatPanel />}
      rightCollapsed={rightCollapsed}
      onToggleRight={() => setRightCollapsed(c => !c)}
    />
  );
};
```

- [ ] **Step 2: Confirm `SELECT * FROM` quoting**

Some sources need quoted identifiers. For this iteration use the bare name (matches the spec's `SELECT * FROM <obj> LIMIT …`). If `grep -n "quoteIdentifier\|quoteTable" frontend/src/utils/*.ts` finds an existing helper, use it for `obj.Name`; otherwise leave bare.

- [ ] **Step 3: Verify typecheck + lint**

```bash
pnpm run typecheck && pnpm run lint
```
Expected: PASS. `raw-execute.tsx` no longer references `ScratchpadActions`/`state.scratchpad`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/raw-execute/raw-execute.tsx
git commit -m "feat(sql-editor): compose full-screen three-panel SQL editor page"
```

---

## Task 13: Routing — render editor full-screen, remove `/chat`

**Files:**
- Modify: `frontend/src/config/routes.tsx`
- Modify: `frontend/src/components/sidebar/sidebar.tsx`

- [ ] **Step 1: Make the editor route render outside `InternalPage`**

The editor page already returns its own full-viewport shell (`SqlEditorLayout`), so it must NOT be wrapped by `InternalPage`. In `routes.tsx`, the `RawExecute` route currently wraps `RawExecutePage` in `SourceSurfaceRoute` (which only gates by contract — fine to keep) but the `InternalPage` wrapper is applied where routes are rendered. Confirm where `InternalPage` is applied:
```bash
grep -rn "InternalPage" frontend/src/components frontend/src/app frontend/src/config | head
```
Expected: identifies the layout wrapper. Ensure the `/scratchpad` path is excluded from the `InternalPage` wrapper (e.g. the page renders InternalPage internally per-page, like ChatPage did — in which case simply NOT wrapping in the new page is sufficient and no change is needed here). If a global wrapper applies `InternalPage` to all internal routes, add a condition to skip it for `InternalRoutes.RawExecute.path`. Document the exact change made.

- [ ] **Step 2: Remove the `/chat` route**

In `routes.tsx`, delete the `Chat` entry from `InternalRoutes` and the `ChatRouteComponent` definition (lines ~46-52 and ~123-127). Keep the `ChatPage` lazy import only if still referenced; otherwise remove it too. Note: the EE `sql-agent` component that `ChatRouteComponent` checked for — if EE relies on a `/chat` route, this removal is CE-only and EE overlays its own routes via `registerRoute`; leave EE handling to `ee/`.

- [ ] **Step 3: Remove the Chat nav entry from the sidebar**

In `sidebar.tsx`, delete the block:
```typescript
if (supportsChat) {
    routes.unshift({
        title: t('chat'),
        icon: <SparklesIcon className="w-4 h-4" />,
        path: InternalRoutes.Chat.path,
    });
}
```
Remove the now-unused `supportsChat` destructure and `SparklesIcon` import only if they become unused (check with the typecheck in Step 4).

- [ ] **Step 4: Verify typecheck + lint**

```bash
pnpm run typecheck && pnpm run lint
```
Expected: PASS. No references to `InternalRoutes.Chat` remain (grep to confirm: `grep -rn "InternalRoutes.Chat" frontend/src` → no results in CE).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/config/routes.tsx frontend/src/components/sidebar/sidebar.tsx
git commit -m "feat(sql-editor): full-screen editor route, remove standalone /chat"
```

---

## Task 14: Localization keys

**Files:**
- Modify: `frontend/src/locales/pages/raw-execute.yaml` (en_US block only)

- [ ] **Step 1: Replace the `en_US` keys**

In `frontend/src/locales/pages/raw-execute.yaml`, edit ONLY the `en_US:` block (lines 1-26). Remove obsolete multi-cell keys (`addCell`, `clearEditor`, `deleteCell`, `deleteCellTitle`, `deleteCellDescription`, `noHistoryTitle`, `noHistoryDescription`, `cloneToEditor`, `clearHistory`, `clearHistoryTitle`, `clearHistoryDescription`, `deletePage`, `deletePageDescription`, `doubleClickEdit`, `deletePageButton`, `addPage`, `queryHistory`, `copyCode`) and add the new keys. Keep `success`, `error`, `copyToClipboard`, `copied`, `confirmExecutionDescription` if still referenced. Resulting `en_US` block:
```yaml
en_US:
  run: Run
  format: Format
  addTab: Add SQL tab
  closeTab: Close tab
  toggleChat: Toggle chat panel
  showChat: Chat
  hideChat: Chat
  back: Back
  searchObjects: Search...
  schemaHeader: Schema
  searchPath: "search_path: {schema}"
  loading: Loading...
  colName: Name
  colType: Type
  colNullable: Nullable
  colDefault: Default
  colKey: Key
  keyPrimary: PK
  keyForeign: FK
  keyUnique: Unique
  yes: "Yes"
  no: "No"
  confirmExecutionTitle: Confirm Execution
  confirmExecutionDescription: This query will modify your database. This action cannot be undone.
  success: Success
  error: Error
  copyToClipboard: Copy to Clipboard
  copied: Copied!
```

- [ ] **Step 2: Verify the YAML parses and typecheck passes**

Run from `frontend/`:
```bash
node -e "require('js-yaml')" 2>/dev/null && node -e "const y=require('js-yaml');const fs=require('fs');y.load(fs.readFileSync('src/locales/pages/raw-execute.yaml','utf8'));console.log('yaml ok')" || echo "skip yaml lib check"
pnpm run typecheck
```
Expected: "yaml ok" (or skip) and typecheck PASS. Cross-check that every `t("…")` key used in Tasks 6-12 exists in this block.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/locales/pages/raw-execute.yaml
git commit -m "feat(sql-editor): localization keys for new editor (en_US)"
```

---

## Task 15: Update the Playwright E2E for the new UI

**Files:**
- Modify: `frontend/e2e/support/whodb/scratchpad.mjs`
- Modify: `frontend/e2e/tests/features/scratchpad.spec.mjs`

- [ ] **Step 1: Read the current E2E to learn the helper API and selectors**

Run from `frontend/`:
```bash
sed -n '1,200p' e2e/support/whodb/scratchpad.mjs
sed -n '1,200p' e2e/tests/features/scratchpad.spec.mjs
```
Expected: shows the page-object helpers (e.g. how it navigates to `/scratchpad`, types a query, runs it, reads results) and the assertions. Note which selectors no longer exist (cells, pages, history).

- [ ] **Step 2: Update the helper to drive the new UI**

Rewrite `scratchpad.mjs` helpers to use the new `data-testid`s: navigate to `/scratchpad`; type into the CodeMirror editor inside `[data-testid="sql-editor-sql-tab"]`; click `[data-testid="sql-editor-run"]`; read results from `[data-testid="cell-query-output"]` (unchanged — `QueryView` keeps that testid); open a tab from the tree via `[data-testid^="sql-editor-tree-object-"]` (single-click = SELECT tab, double-click = structure tab `[data-testid="sql-editor-structure-tab"]`); click `[data-testid="sql-editor-format"]` for format; add a tab via `[data-testid="sql-editor-add-tab"]`. Preserve the file's existing export shape so the spec keeps importing the same helper object.

- [ ] **Step 3: Update the spec assertions**

In `scratchpad.spec.mjs`: keep "run a query → see results" and "format reflows SQL" tests; replace any cell/page/history-specific tests with: "single-click tree object opens a SELECT tab and shows results", "double-click tree object opens a structure tab listing columns". Remove tests asserting multi-cell or query-history UI (those features are gone).

- [ ] **Step 4: Run the E2E against Postgres**

Run from `frontend/`:
```bash
pnpm e2e:db:headless postgres scratchpad
```
Expected: the scratchpad feature suite passes. (Uses the existing Docker test DB harness.) Iterate on selectors until green.

- [ ] **Step 5: Check for other E2E features that referenced removed UI**

Run from `frontend/`:
```bash
grep -rln "moveToScratchpad\|/chat\|query-history\|addCell\|scratchpad page" e2e
```
Expected: review hits. Update or remove the `query-history` feature spec (the per-cell history UI is gone) and any chat spec that navigated to `/chat` (chat is now only the editor's panel). Make the minimal edits to keep suites green; note removed coverage in the commit message.

- [ ] **Step 6: Commit**

```bash
git add frontend/e2e
git commit -m "test(sql-editor): update E2E for new SQL editor UI"
```

---

## Task 16: Full verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Type check + build**

Run from `frontend/`:
```bash
pnpm run build:ce
```
Expected: PASS (tsc + vite build succeed).

- [ ] **Step 2: Lint**

```bash
pnpm run lint
```
Expected: no errors.

- [ ] **Step 3: Dead-code / leftover-reference sweep**

```bash
grep -rn "scratchpad\b\|Scratchpad\|ScratchpadActions\|state.scratchpad\|InternalRoutes.Chat" frontend/src
```
Expected: only acceptable references remain — the route `InternalRoutes.RawExecute` keeps `path: "/scratchpad"` (URL unchanged), and any `surface="scratchpad"` contract flag. No references to the deleted slice, `ScratchpadActions`, `state.scratchpad`, or `InternalRoutes.Chat`. Investigate anything else.

- [ ] **Step 4: Manual smoke test (per spec "Manual" list)**

Run the app (`cd frontend && pnpm start` against a running backend) and verify: run a SELECT (results show); run a destructive query (confirm dialog appears); single-click a tree object (SELECT tab opens + runs); double-click a tree object (structure tab lists columns/keys); expand chat from collapsed, send a prompt, Insert/Run a returned SQL; collapse/resize panels; reload (tabs persist, chat stays collapsed by default on first load).

- [ ] **Step 5: Final commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix(sql-editor): verification sweep fixes"
```

---

## Self-Review Notes

- **Spec coverage:** layout shell (T4), source selectors (T5), DB tree single/double-click (T6, wired in T12), tabs SQL/structure (T2, T7, T9, T10), Run+Format (T8, T9, T1), results reuse (T9), status bar (T9), chat embedded + collapsed-by-default + move-to-editor (T11, T12), state slice + persistence (T2, T3), routing full-screen + `/chat` removal + nav entry (T13), localization (T14), E2E + verification (T15, T16). Indexes intentionally dropped (spec updated).
- **Known follow-up to resolve during execution (not placeholders — explicit verification steps):** exact `switchProfile` export (T5§1), `buildSourceSchemaQuery` return shape (T6§2), `AlertDialog` prop API (T9§2), `InternalPage` wrapper application point (T13§1), `registerRawExecuteExtensions` external importers (T12§1). Each has a concrete grep + adjust instruction.
- **Type consistency:** slice actions (`ensureTab`, `addSqlTab`, `openStructureTab`, `closeTab`, `renameTab`, `updateTabCode`, `setActiveTab`) are used with matching payloads across T7/T9/T11/T12. `SourceObjectRefInput` `{ Kind, Locator, Path }` constructed identically in T6→T12 and consumed in T10.
