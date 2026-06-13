import { AgGridReact } from 'ag-grid-react';
import type { GridApi, GridReadyEvent, CellClickedEvent, CellDoubleClickedEvent, CellContextMenuEvent } from 'ag-grid-community';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, toast } from '@clidey/ux';
import { useTranslation } from '@/hooks/use-translation';
import { copyToClipboard } from '@/services/clipboard';
import { ArrowDownCircleIcon } from '../heroicons';
import { useGridTheme } from './use-grid-theme';
import { buildColumnDefs, buildRowData } from './grid-column-defs';
import type { ResultGridProps } from './types';
import { GridContextMenu } from './grid-context-menu';
import type { GridContextTarget } from './grid-context-menu';

const DEFAULT_ROW_HEIGHT = 48;

/** ag-grid-based result grid. ag-grid renders/edits/selects; WhoDB owns the chrome. */
export function ResultGrid(props: ResultGridProps) {
    const { data, layout, actions, sorting, databaseType: _databaseType } = props;
    const { t } = useTranslation('components/table');
    const theme = useGridTheme();
    const apiRef = useRef<GridApi | null>(null);
    const [menuTarget, setMenuTarget] = useState<GridContextTarget | null>(null);

    const editable = false; // Phase 3 wires real editability
    const columnDefs = useMemo(
        () => buildColumnDefs({
            columns: data.columns,
            columnTypes: data.columnTypes,
            columnIsPrimary: data.columnIsPrimary,
            columnIsForeignKey: data.columnIsForeignKey,
            editable,
            onColumnSort: sorting?.onColumnSort,
            sortedColumns: sorting?.sortedColumns,
            t,
        }),
        [data.columns, data.columnTypes, data.columnIsPrimary, data.columnIsForeignKey, editable, sorting, t],
    );
    const rowData = useMemo(() => buildRowData(data.rows), [data.rows]);

    const onGridReady = useCallback((e: GridReadyEvent) => { apiRef.current = e.api; }, []);

    // Quick-filter search via the imperative searchRef.
    useEffect(() => {
        if (!props.searchRef) return;
        props.searchRef.current = (search: string) => {
            apiRef.current?.setGridOption('quickFilterText', search);
        };
    }, [props.searchRef]);

    // Single-click copies a cell; debounced so a double-click cancels it.
    const clickTimer = useRef<number | null>(null);
    const onCellClicked = useCallback((e: CellClickedEvent) => {
        if (clickTimer.current) clearTimeout(clickTimer.current);
        const value = e.value;
        clickTimer.current = window.setTimeout(() => {
            if (value != null) {
                void copyToClipboard(String(value)).then(ok => { if (ok) toast.success(t('copiedToClipboard')); });
            }
        }, 200);
    }, [t]);
    const onCellDoubleClicked = useCallback((_e: CellDoubleClickedEvent) => {
        if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
        // double-click enters native edit (when editable); copy-row lives in the context menu
    }, []);

    const onCellContextMenu = useCallback((e: CellContextMenuEvent) => {
        const colId = e.column?.getColId() ?? 'c0';
        const colIndex = Number(colId.replace('c', ''));
        const rowIndex = Number((e.data as Record<string, string>).__rowIndex);
        setMenuTarget({ rowIndex, colIndex });
    }, []);

    const onCopyCell = useCallback(() => {
        if (menuTarget == null) return;
        const value = data.rows[menuTarget.rowIndex]?.[menuTarget.colIndex];
        if (value != null) {
            void copyToClipboard(String(value)).then(ok => { if (ok) toast.success(t('copiedCellToClipboard')); });
        }
    }, [menuTarget, data.rows, t]);

    const onCopyRow = useCallback(() => {
        if (menuTarget == null) return;
        const row = data.rows[menuTarget.rowIndex];
        if (row != null) {
            void copyToClipboard(row.join('\t')).then(ok => { if (ok) toast.success(t('rowCopiedToClipboard')); });
        }
    }, [menuTarget, data.rows, t]);

    const triggerExport = () => window.dispatchEvent(new CustomEvent('menu:trigger-export'));

    const rowHeight = layout?.rowHeight ?? DEFAULT_ROW_HEIGHT;
    const height = layout?.enforceMinHeight
        ? (layout?.height ?? 500)
        : Math.min((data.rows.length || 1) * rowHeight + 80, layout?.height ?? 500);

    return (
        <div className="flex flex-col w-full h-full" data-testid="result-grid">
            {!actions?.hideFooterControls && (
                <div className="flex items-center justify-end gap-2 px-2 py-1 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0">
                    <Button variant="secondary" onClick={triggerExport} className="flex gap-sm" data-testid="result-grid-export">
                        <ArrowDownCircleIcon className="w-4 h-4" />
                        {t('export')}
                    </Button>
                </div>
            )}
            <GridContextMenu
                target={menuTarget}
                onCopyCell={onCopyCell}
                onCopyRow={onCopyRow}
                selectedCount={0}
                limited={props.limitContextMenu}
                t={t}
            >
                <div style={{ height, width: '100%' }}>
                    <AgGridReact
                        theme={theme}
                        columnDefs={columnDefs}
                        rowData={rowData}
                        rowHeight={rowHeight}
                        onGridReady={onGridReady}
                        onCellClicked={onCellClicked}
                        onCellDoubleClicked={onCellDoubleClicked}
                        onCellContextMenu={onCellContextMenu}
                        preventDefaultOnContextMenu={false}
                        rowSelection={(props.editing || props.actions?.rawQuery) ? { mode: 'multiRow', checkboxes: true, headerCheckbox: true } : undefined}
                        suppressCellFocus={false}
                        getRowId={(p) => String((p.data as Record<string, string>).__rowIndex)}
                    />
                </div>
            </GridContextMenu>
            {props.children}
        </div>
    );
}
