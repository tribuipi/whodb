import type { SourceObjectRefInput } from '@graphql';
import type React from 'react';

export interface ResultGridData {
    columns: string[];
    columnTypes?: string[];
    columnIsPrimary?: boolean[];
    columnIsForeignKey?: boolean[];
    rows: string[][];
}

export interface ResultGridLayout {
    height?: number;
    rowHeight?: number;
    enforceMinHeight?: boolean;
}

export interface ResultGridEditing {
    onRowUpdate: (row: Record<string, string | number>, originalRow?: Record<string, string | number>) => Promise<void>;
    allowRowUpdate?: boolean;
    allowRowDelete?: boolean;
    objectRef?: SourceObjectRefInput;
    storageUnit?: string;
    onRefresh?: () => void;
}

export interface ResultGridSorting {
    onColumnSort: (column: string) => void;
    sortedColumns?: Map<string, 'asc' | 'desc'>;
}

export interface ResultGridPagination {
    totalCount?: number;
    currentPage?: number;
    onPageChange?: (page: number) => void;
    pageSize?: number;
    show?: boolean;
}

export interface ResultGridActions {
    rawQuery?: string;
    allowImport?: boolean;
    isMockDataGenerationAllowed?: boolean;
    hideFooterControls?: boolean;
}

export interface ResultGridForeignKeys {
    isValidForeignKey?: (columnName: string) => boolean;
    onEntitySearch?: (columnName: string, value: string) => void;
}

export interface ResultGridProps {
    data: ResultGridData;
    layout?: ResultGridLayout;
    editing?: ResultGridEditing;
    sorting?: ResultGridSorting;
    pagination?: ResultGridPagination;
    actions?: ResultGridActions;
    foreignKeys?: ResultGridForeignKeys;
    databaseType?: string;
    /** Limits the context menu to copy/export only (used by read-only chat/scratchpad). */
    limitContextMenu?: boolean;
    /** Enables app-level keyboard shortcuts (explorer only). */
    enableKeyboardShortcuts?: boolean;
    /** Imperative search: sets the grid's quick-filter text. */
    searchRef?: React.MutableRefObject<((search: string) => void) | null>;
    /** Extra footer content (e.g. the explorer's add-row button). */
    children?: React.ReactNode;
}
