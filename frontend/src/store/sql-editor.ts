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
