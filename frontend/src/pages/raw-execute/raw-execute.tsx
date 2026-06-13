import type { FC } from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HomeIcon } from "../../components/heroicons";
import { InternalRoutes } from "../../config/routes";
import { useTranslation } from "../../hooks/use-translation";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { SqlEditorActions } from "../../store/sql-editor";
import { ChatPanel } from "./chat-panel";
import { EditorTabs } from "./editor-tabs";
import { ObjectTree } from "./object-tree";
import { SourceSelectors } from "./source-selectors";
import { SqlEditorLayout } from "./sql-editor-layout";
import { SqlTab } from "./sql-tab";
import { StructureTab } from "./structure-tab";

/** Full-screen three-panel SQL editor page rendered at the scratchpad route. */
export const RawExecutePage: FC = () => {
  const { t } = useTranslation("pages/raw-execute");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const tabs = useAppSelector(state => state.sqlEditor.tabs);
  const activeTabId = useAppSelector(state => state.sqlEditor.activeTabId);
  const [rightCollapsed, setRightCollapsed] = useState(true);

  useEffect(() => {
    dispatch(SqlEditorActions.ensureTab());
  }, [dispatch]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const left = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => { void navigate(InternalRoutes.Dashboard.StorageUnit.path); }}
          aria-label={t("back")}
          data-testid="sql-editor-back"
        >
          <HomeIcon className="w-4 h-4" />
        </button>
      </div>
      <SourceSelectors />
      <div className="flex-1 min-h-0">
        <ObjectTree
          onSelectObject={obj => {
            dispatch(SqlEditorActions.addSqlTab({
              name: obj.Name,
              code: `SELECT * FROM ${obj.Name} LIMIT 100;`,
            }));
          }}
          onOpenStructure={obj => {
            dispatch(SqlEditorActions.openStructureTab({ name: obj.Name, target: obj.Ref }));
          }}
        />
      </div>
    </div>
  );

  const center = (
    <div className="flex flex-col h-full">
      <EditorTabs rightCollapsed={rightCollapsed} onToggleRight={() => { setRightCollapsed(c => !c); }} />
      <div className="flex-1 min-h-0">
        {activeTab?.kind === "structure"
          ? <StructureTab key={activeTab.id} tabId={activeTab.id} />
          : activeTab != null
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
      onToggleRight={() => { setRightCollapsed(c => !c); }}
    />
  );
};
