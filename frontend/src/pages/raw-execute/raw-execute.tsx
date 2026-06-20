import type { FC } from "react";
import { useEffect, useState } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { DefaultTableQueryDocument } from "@graphql";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { SqlEditorActions } from "../../store/sql-editor";
import { formatSql } from "../../utils/format-sql";
import { ChatPanel } from "./chat-panel";
import { EditorTabs } from "./editor-tabs";
import { ObjectTree } from "./object-tree";
import { SourceSelectors } from "./source-selectors";
import { SqlEditorLayout } from "./sql-editor-layout";
import { SqlTab } from "./sql-tab";
import { StructureTab } from "./structure-tab";

/** Full-screen three-panel SQL editor page rendered at the scratchpad route. */
export const RawExecutePage: FC = () => {
  const dispatch = useAppDispatch();
  const tabs = useAppSelector(state => state.sqlEditor.tabs);
  const activeTabId = useAppSelector(state => state.sqlEditor.activeTabId);
  const schema = useAppSelector(state => state.database.schema);
  const currentType = useAppSelector(state => state.auth.current?.Type);
  const [rightCollapsed, setRightCollapsed] = useState(true);
  const [fetchDefaultQuery] = useLazyQuery(DefaultTableQueryDocument);

  useEffect(() => {
    dispatch(SqlEditorActions.ensureTab());
  }, [dispatch]);

  const left = (
    <div className="flex flex-col h-full">
      <SourceSelectors />
      <div className="flex-1 min-h-0">
        <ObjectTree
          onSelectObject={async obj => {
            const { data } = await fetchDefaultQuery({
              variables: { ref: { Kind: obj.Ref.Kind, Path: obj.Ref.Path, Locator: obj.Ref.Locator }, limit: 100, schema: schema ?? null },
            });
            if (!data?.DefaultTableQuery) return;
            dispatch(SqlEditorActions.addSqlTab({
              name: obj.Name,
              code: formatSql(data.DefaultTableQuery, currentType),
              autoRun: true,
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
        {tabs.map(tab => (
          <div key={tab.id} className={activeTabId === tab.id ? "h-full" : "hidden"}>
            {tab.kind === "structure"
              ? <StructureTab tabId={tab.id} />
              : <SqlTab tabId={tab.id} />}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <SqlEditorLayout
      left={left}
      center={center}
      right={<ChatPanel />}
      rightCollapsed={rightCollapsed}
    />
  );
};
