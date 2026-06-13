import type { FC } from "react";
import { useState } from "react";
import { useTranslation } from "../../hooks/use-translation";
import { XMarkIcon, PlusIcon, SparklesIcon } from "../../components/heroicons";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { SqlEditorActions } from "../../store/sql-editor";

type IEditorTabsProps = {
  rightCollapsed: boolean;
  onToggleRight: () => void;
};

/** Tab strip for the SQL editor: SQL/structure tabs, add button, and chat toggle. */
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
          onClick={() => { dispatch(SqlEditorActions.setActiveTab({ tabId: tab.id })); }}
          onDoubleClick={() => { if (tab.kind === "sql") setEditingId(tab.id); }}
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
      <button onClick={() => { dispatch(SqlEditorActions.addSqlTab()); }} aria-label={t("addTab")} className="px-2 text-neutral-500" data-testid="sql-editor-add-tab">
        <PlusIcon className="w-4 h-4" />
      </button>
      <div className="flex-1" />
      <button onClick={onToggleRight} aria-label={t("toggleChat")} className={`px-2 ${rightCollapsed ? "text-neutral-500" : "text-blue-500"}`} data-testid="sql-editor-toggle-chat">
        <SparklesIcon className="w-4 h-4" />
      </button>
    </div>
  );
};
