import type { FC } from "react";
import { useTranslation } from "../../hooks/use-translation";
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
