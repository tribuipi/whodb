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
export const SqlEditorLayout: FC<ISqlEditorLayoutProps> = ({ left, center, right, rightCollapsed, onToggleRight: _onToggleRight }) => {
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
