import type { FC } from "react";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { SqlEditorActions } from "../../store/sql-editor";
import { formatSql, quoteIdentifier } from "../../utils/format-sql";
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

  useEffect(() => {
    dispatch(SqlEditorActions.ensureTab());
  }, [dispatch]);

  const left = (
    <div className="flex flex-col h-full">
      <SourceSelectors />
      <div className="flex-1 min-h-0">
        <ObjectTree
          onSelectObject={obj => {
            const quotedName = quoteIdentifier(obj.Name, currentType);
            const qualified = schema ? `${quoteIdentifier(schema, currentType)}.${quotedName}` : quotedName;
            dispatch(SqlEditorActions.addSqlTab({
              name: obj.Name,
              code: formatSql(`SELECT * FROM ${qualified} LIMIT 100;`, currentType),
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
