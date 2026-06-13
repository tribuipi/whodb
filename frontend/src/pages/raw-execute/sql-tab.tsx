import type { FC } from "react";
import { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from "@clidey/ux";
import { useTranslation } from "../../hooks/use-translation";
import { useContainerWidth } from "../../hooks/use-container-width";
import { CodeEditor } from "../../components/editor";
import { QueryView } from "./query-view";
import { EditorToolbar } from "./editor-toolbar";
import { formatSql } from "../../utils/format-sql";
import { isDestructiveQuery } from "../../utils/query-utils";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { SqlEditorActions } from "../../store/sql-editor";
import { useAI } from "../../components/ai";

type ISqlTabProps = {
  tabId: string;
};

/** A single SQL editor tab: editor on top, results below, with destructive-query confirmation. */
export const SqlTab: FC<ISqlTabProps> = ({ tabId }) => {
  const { t } = useTranslation("pages/raw-execute");
  const dispatch = useAppDispatch();
  const code = useAppSelector(state => state.sqlEditor.tabs.find(tab => tab.id === tabId)?.code ?? "");
  const currentType = useAppSelector(state => state.auth.current?.Type);
  const currentDatabase = useAppSelector(state => state.auth.current?.Database);
  const currentId = useAppSelector(state => state.auth.current?.Id);
  const { modelType } = useAI();

  const handleExecuteRef = useRef<((code: string) => Promise<any>) | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(resultsContainerRef);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const setCode = useCallback((value: string) => {
    dispatch(SqlEditorActions.updateTabCode({ tabId, code: value }));
  }, [dispatch, tabId]);

  const doExecute = useCallback((sql: string) => {
    void handleExecuteRef.current?.(sql);
  }, []);

  const onRun = useCallback((sql?: string) => {
    const target = (sql ?? code).trim();
    if (target.length === 0) {
      return;
    }
    if (isDestructiveQuery(target)) {
      setPendingCode(target);
    } else {
      doExecute(target);
    }
  }, [code, doExecute]);

  const onFormat = useCallback(() => {
    setCode(formatSql(code, currentType));
  }, [code, currentType, setCode]);

  const handleConfirm = useCallback(() => {
    if (pendingCode != null) {
      doExecute(pendingCode);
      setPendingCode(null);
    }
  }, [pendingCode, doExecute]);

  const handleCancel = useCallback(() => {
    setPendingCode(null);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="sql-editor-sql-tab">
      <EditorToolbar onRun={() => { onRun(); }} onFormat={onFormat} />
      <div className="flex-1 min-h-0 overflow-auto">
        <CodeEditor language="sql" value={code} setValue={setCode} onRun={(lineText) => { onRun(lineText); }} />
      </div>
      <div className="px-2 py-0.5 text-[10px] text-neutral-500 border-t border-neutral-200 dark:border-neutral-800">
        {t("searchPath", { schema: currentDatabase ?? "" })}
      </div>
      <div className="h-1 bg-neutral-200 dark:bg-neutral-800 cursor-row-resize flex-shrink-0" data-testid="sql-editor-results-divider" />
      <div ref={resultsContainerRef} className="h-[40%] overflow-auto border-t border-neutral-200 dark:border-neutral-800">
        <QueryView
          code={code}
          handleExecuteRef={handleExecuteRef}
          modelType={modelType?.modelType ?? ""}
          schema={currentDatabase ?? ""}
          token={modelType?.token}
          providerId={currentId}
          containerWidth={containerWidth}
        />
      </div>
      <AlertDialog open={pendingCode != null} onOpenChange={(open) => { if (!open) { handleCancel(); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmExecutionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmExecutionDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="execute-query-cancel" onClick={handleCancel}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button variant="destructive" data-testid="execute-query-confirm" onClick={handleConfirm}>
                {t("executeQuery")}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
