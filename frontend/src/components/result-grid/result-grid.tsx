import { AgGridReact } from 'ag-grid-react';
import type { GridApi, GridReadyEvent, CellClickedEvent, CellDoubleClickedEvent, CellContextMenuEvent, SelectionChangedEvent } from 'ag-grid-community';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Spinner, toast } from '@clidey/ux';
import { useTranslation } from '@/hooks/use-translation';
import { copyToClipboard } from '@/services/clipboard';
import { ArrowDownCircleIcon, ArrowUpCircleIcon } from '../heroicons';
import { useGridTheme } from './use-grid-theme';
import { buildColumnDefs, buildRowData } from './grid-column-defs';
import type { ResultGridProps } from './types';
import { GridContextMenu } from './grid-context-menu';
import type { GridContextTarget } from './grid-context-menu';
import { Export } from '../export';
import { ImportData } from '../import-data';
import { useSourceContract } from '@/hooks/useSourceContract';
import { sourceObjectSupportsAction } from '@/config/source-types';
import { SourceAction } from '@graphql';
import { formatNumber } from '@/utils/functions';

const DEFAULT_ROW_HEIGHT = 48;

/** ag-grid-based result grid. ag-grid renders/edits/selects; WhoDB owns the chrome. */
export function ResultGrid(props: ResultGridProps) {
    const { data, layout, actions, sorting } = props;
    const { t, language } = useTranslation('components/table');
    const theme = useGridTheme();
    const apiRef = useRef<GridApi | null>(null);
    const [menuTarget, setMenuTarget] = useState<GridContextTarget | null>(null);

    // Source-action gating
    const objectRef = props.editing?.objectRef;
    const { item } = useSourceContract(props.databaseType);
    const isImportSupported = sourceObjectSupportsAction(item, objectRef?.Kind, SourceAction.ImportData);
    const isExportSupported = props.actions?.rawQuery != null || sourceObjectSupportsAction(item, objectRef?.Kind, SourceAction.ViewRows);

    // Selection tracking
    const [selectedRows, setSelectedRows] = useState<Record<string, string>[]>([]);
    const onSelectionChanged = useCallback((e: SelectionChangedEvent) => {
        setSelectedRows(e.api.getSelectedRows() as Record<string, string>[]);
    }, []);

    // Export / import sheet state
    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [preselectedFormat, setPreselectedFormat] = useState<'csv' | 'excel' | 'ndjson' | undefined>(undefined);
    const [forceExportAll, setForceExportAll] = useState(false);

    const hasSelectedRows = selectedRows.length > 0;

    // Map an ag-grid row object ({c0,c1,...,__rowIndex}) back to a named record keyed by real column name.
    const toNamedRow = useCallback((r: Record<string, string>) => {
        const rowIdx = Number(r.__rowIndex);
        const source = data.rows[rowIdx] ?? [];
        const obj: Record<string, string> = {};
        data.columns.forEach((col, i) => { obj[col] = source[i]; });
        return obj;
    }, [data.columns, data.rows]);

    const selectedRowsData = useMemo(() => {
        if (hasSelectedRows) return selectedRows.map(toNamedRow);
        if (props.actions?.rawQuery) {
            return data.rows.map((row) => {
                const obj: Record<string, string> = {};
                data.columns.forEach((col, i) => { obj[col] = row[i]; });
                return obj;
            });
        }
        return undefined;
    }, [hasSelectedRows, selectedRows, toNamedRow, props.actions?.rawQuery, data.rows, data.columns]);

    const openExport = useCallback((format?: 'csv' | 'excel' | 'ndjson', exportAll?: boolean) => {
        if (!isExportSupported) return;
        setPreselectedFormat(format);
        setForceExportAll(exportAll ?? false);
        setShowExportConfirm(true);
    }, [isExportSupported]);

    // menu:trigger-export / menu:trigger-import window listeners
    useEffect(() => {
        const handler = () =>{  openExport(); };
        window.addEventListener('menu:trigger-export', handler);
        return () =>{  window.removeEventListener('menu:trigger-export', handler); };
    }, [openExport]);

    useEffect(() => {
        const handler = () => { if (isImportSupported && props.actions?.allowImport) setShowImport(true); };
        window.addEventListener('menu:trigger-import', handler);
        return () =>{  window.removeEventListener('menu:trigger-import', handler); };
    }, [isImportSupported, props.actions?.allowImport]);

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

    const totalCount = props.pagination?.totalCount ?? data.rows.length;

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
                selectedCount={selectedRows.length}
                onExport={isExportSupported ? (format, scope) =>{  openExport(format, scope === 'all'); } : undefined}
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
                        onSelectionChanged={onSelectionChanged}
                        preventDefaultOnContextMenu={false}
                        rowSelection={(props.editing || props.actions?.rawQuery) ? { mode: 'multiRow', checkboxes: true, headerCheckbox: true } : undefined}
                        suppressCellFocus={false}
                        getRowId={(p) => String((p.data as Record<string, string>).__rowIndex)}
                    />
                </div>
            </GridContextMenu>
            {!props.actions?.hideFooterControls && (
                <div className="flex justify-end items-center gap-4 px-2 py-1 flex-shrink-0">
                    {totalCount != null && totalCount > 0 && (
                        <div className="text-sm" data-testid="total-count-bottom">
                            <span className="font-semibold">{t('totalCount')}</span> {formatNumber(totalCount, language)}
                        </div>
                    )}
                    {isImportSupported && props.actions?.allowImport && (
                        <Button variant="secondary" onClick={() =>{  setShowImport(true); }} className="flex gap-sm" data-testid="import-button">
                            <ArrowUpCircleIcon className="w-4 h-4" />
                            {t('importAction')}
                        </Button>
                    )}
                </div>
            )}
            {props.children}
            {isExportSupported && (
                <Suspense fallback={<Spinner />}>
                    <Export
                        open={showExportConfirm}
                        onOpenChange={setShowExportConfirm}
                        storageUnit={props.actions?.rawQuery ? 'query_export' : (props.editing?.storageUnit ?? '')}
                        objectRef={objectRef}
                        hasSelectedRows={hasSelectedRows}
                        selectedRowsData={selectedRowsData}
                        checkedRowsCount={selectedRows.length}
                        databaseType={props.databaseType}
                        rawQuery={props.actions?.rawQuery}
                        preselectedFormat={preselectedFormat}
                        forceExportAll={forceExportAll}
                    />
                </Suspense>
            )}
            {isImportSupported && props.actions?.allowImport && (
                <ImportData
                    open={showImport}
                    onOpenChange={setShowImport}
                    objectRef={objectRef}
                    databaseType={props.databaseType}
                    onImportSuccess={props.editing?.onRefresh}
                />
            )}
        </div>
    );
}
