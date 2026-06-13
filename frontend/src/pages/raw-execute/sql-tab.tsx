import type { FC } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from "../../hooks/use-translation";
import { useContainerWidth } from "../../hooks/use-container-width";
import { CodeEditor } from "../../components/editor";
import { ErrorState } from "../../components/error-state";
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

/** Apollo aborts in-flight requests when its subscription is torn down; those rejections are not real query errors. */
function isAbortError(err: unknown): boolean {
  if (err == null || typeof err !== "object") {
    return false;
  }
  const e = err as { name?: string; message?: string; networkError?: { name?: string; message?: string } };
  const name = e.name ?? e.networkError?.name;
  const message = e.message ?? e.networkError?.message ?? "";
  return name === "AbortError" || /operation was aborted/i.test(message);
}

/** A single SQL editor tab: editor on top, results below, with destructive-query confirmation. */
export const SqlTab: FC<ISqlTabProps> = ({ tabId }) => {
  const { t } = useTranslation("pages/raw-execute");
  const dispatch = useAppDispatch();
  const code = useAppSelector(state => state.sqlEditor.tabs.find(tab => tab.id === tabId)?.code ?? "");
  const autoRun = useAppSelector(state => state.sqlEditor.tabs.find(tab => tab.id === tabId)?.autoRun ?? false);
  const currentType = useAppSelector(state => state.auth.current?.Type);
  const currentDatabase = useAppSelector(state => state.auth.current?.Database);
  const currentId = useAppSelector(state => state.auth.current?.Id);
  const { modelType } = useAI();

  const handleExecuteRef = useRef<((code: string) => Promise<any>) | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(resultsContainerRef);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [editorHeight, setEditorHeight] = useState(260);
  const [resultsHeight, setResultsHeight] = useState(0);

  // Track the results pane's available height so the table can fill it.
  useEffect(() => {
    const el = resultsContainerRef.current;
    if (el == null) {
      return;
    }
    const update = () => { setResultsHeight(el.clientHeight); };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => { observer.disconnect(); };
  }, []);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = editorHeight;
    const onMove = (ev: MouseEvent) => {
      setEditorHeight(Math.max(120, startHeight + (ev.clientY - startY)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [editorHeight]);

  const setCode = useCallback((value: string) => {
    dispatch(SqlEditorActions.updateTabCode({ tabId, code: value }));
  }, [dispatch, tabId]);

  const doExecute = useCallback((sql: string) => {
    setError(null);
    setTotalCount(null);
    void handleExecuteRef.current?.(sql)?.catch((err: unknown) => {
      if (isAbortError(err)) {
        return;
      }
      setError(err instanceof Error ? err : new Error(String(err)));
    });
  }, []);

  const handleResult = useCallback((count: number | null) => {
    setTotalCount(count);
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

  // Run once when the tab is opened from the object tree, then clear the flag.
  // Defer to a timer so StrictMode's mount/cleanup/mount cycle doesn't abort the
  // in-flight query — the discarded mount's timer is cancelled in cleanup, so only
  // the stable mount actually fires the query.
  useEffect(() => {
    if (!autoRun) {
      return;
    }
    const id = setTimeout(() => {
      onRun();
      dispatch(SqlEditorActions.clearAutoRun({ tabId }));
    }, 0);
    return () => { clearTimeout(id); };
  }, [autoRun, onRun, dispatch, tabId]);

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
      <div style={{ height: editorHeight }} className="flex-shrink-0 overflow-auto">
        <CodeEditor language="sql" value={code} setValue={setCode} onRun={(lineText) => { onRun(lineText); }} />
      </div>
      <div
        onMouseDown={startResize}
        className="h-1 bg-neutral-200 dark:bg-neutral-800 cursor-row-resize flex-shrink-0 hover:bg-blue-400/40"
        data-testid="sql-editor-results-divider"
      />
      <div ref={resultsContainerRef} className="flex-1 min-h-0 overflow-hidden border-t border-neutral-200 dark:border-neutral-800">
        {error != null && (
          <div className="p-2" data-testid="cell-error">
            <ErrorState error={error} />
          </div>
        )}
        <QueryView
          code={code}
          handleExecuteRef={handleExecuteRef}
          modelType={modelType?.modelType ?? ""}
          schema={currentDatabase ?? ""}
          token={modelType?.token}
          providerId={currentId}
          containerWidth={containerWidth}
          height={resultsHeight}
          onResult={handleResult}
        />
      </div>
      <div
        className="px-2 py-1 text-[10px] text-neutral-500 border-t border-neutral-200 dark:border-neutral-800 flex-shrink-0"
        data-testid="sql-editor-status-bar"
      >
        {totalCount != null && t("totalCount", { count: totalCount })}
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
            <AlertDialogAction variant="destructive" data-testid="execute-query-confirm" onClick={handleConfirm}>
              {t("executeQuery")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
