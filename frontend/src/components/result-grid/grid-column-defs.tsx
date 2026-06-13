import type { ColDef } from 'ag-grid-community';
import { GridHeader } from './grid-header';
import { getColumnIcons, getInputPropsForColumnType } from './column-icons';

const FIELD = (idx: number) => `c${idx}`;

/** Maps string[][] rows to ag-grid row objects keyed by column index (avoids duplicate-name collisions). */
export function buildRowData(rows: string[][]): Record<string, string>[] {
    return rows.map((row, rowIdx) => {
        const obj: Record<string, string> = { __rowIndex: String(rowIdx) };
        row.forEach((cell, colIdx) => { obj[FIELD(colIdx)] = cell; });
        return obj;
    });
}

export interface BuildColumnDefsArgs {
    columns: string[];
    columnTypes?: string[];
    columnIsPrimary?: boolean[];
    columnIsForeignKey?: boolean[];
    editable: boolean;
    /** Provided => server-side sort (header click calls onColumnSort); absent => native client sort. */
    onColumnSort?: (column: string) => void;
    sortedColumns?: Map<string, 'asc' | 'desc'>;
    t: (key: string) => string;
}

/** Builds ag-grid column definitions, including the type icon header and type-aware editors. */
export function buildColumnDefs(args: BuildColumnDefsArgs): ColDef[] {
    const { columns, columnTypes, columnIsPrimary, columnIsForeignKey, editable, onColumnSort, sortedColumns, t } = args;
    const icons = getColumnIcons(columns, columnTypes, t);

    return columns.map((name, idx): ColDef => {
        const rawType = columnTypes?.[idx] ?? '';
        const inputProps = getInputPropsForColumnType(rawType);
        const isNumber = inputProps.type === 'number';
        return {
            field: FIELD(idx),
            headerName: name,
            editable,
            sortable: !onColumnSort,
            filter: true,
            resizable: true,
            minWidth: 100,
            cellEditor: isNumber ? 'agNumberCellEditor' : 'agTextCellEditor',
            headerComponent: GridHeader,
            headerComponentParams: {
                typeIcon: icons[idx],
                isPrimary: columnIsPrimary?.[idx],
                isForeignKey: columnIsForeignKey?.[idx],
                onServerSort: onColumnSort ? () =>{  onColumnSort(name); } : undefined,
                serverSortDir: sortedColumns?.get(name),
            },
        };
    });
}
