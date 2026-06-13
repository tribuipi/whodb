import type React from 'react';
import {
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
    ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
    ArrowDownTrayIcon,
    CheckCircleIcon,
    DocumentDuplicateIcon,
    DocumentIcon,
    DocumentTextIcon,
    MagnifyingGlassIcon,
    PencilSquareIcon,
    TrashIcon,
} from '../heroicons';

export interface GridContextTarget {
    rowIndex: number;
    colIndex: number;
}

export interface GridContextMenuProps {
    children: React.ReactNode;
    /** The right-clicked cell; null before any right-click. Menu items act on this. */
    target: GridContextTarget | null;
    onCopyCell: () => void;
    onCopyRow: () => void;
    onEditCell?: () => void;
    onDeleteRow?: () => void;
    onDeleteSelected?: () => void;
    /** Toggle selection of the right-clicked row. */
    onToggleSelect?: () => void;
    /** Whether the right-clicked row is currently selected (controls the menu label). */
    isTargetSelected?: boolean;
    selectedCount: number;
    onExport?: (format: 'csv' | 'excel', scope: 'selected' | 'all') => void;
    onForeignKey?: () => void;
    onMockData?: () => void;
    /** When true, only copy + export items are shown (read-only chat/scratchpad). */
    limited?: boolean;
    t: (key: string, opts?: Record<string, unknown>) => string;
}

/** Wraps the grid in a Radix context menu; items act on the right-clicked cell (`target`). */
export function GridContextMenu(props: GridContextMenuProps) {
    const {
        children,
        onCopyCell,
        onCopyRow,
        onEditCell,
        onDeleteRow,
        onDeleteSelected,
        onToggleSelect,
        isTargetSelected,
        selectedCount,
        onExport,
        onForeignKey,
        onMockData,
        limited,
        t,
    } = props;
    return (
        <ContextMenu>
            <ContextMenuTrigger className="contents">
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52 max-h-[calc(100vh-2rem)] overflow-y-auto" collisionPadding={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <ContextMenuItem onSelect={onCopyCell}>
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    {t('copyCell')}
                </ContextMenuItem>
                <ContextMenuItem onSelect={onCopyRow}>
                    <DocumentTextIcon className="w-4 h-4" />
                    {t('copyRow')}
                </ContextMenuItem>
                {onForeignKey && (
                    <ContextMenuItem onSelect={onForeignKey}>
                        <MagnifyingGlassIcon className="w-4 h-4" />
                        {t('searchForEntity')}
                    </ContextMenuItem>
                )}
                {!limited && onToggleSelect && (
                    <ContextMenuItem onSelect={onToggleSelect}>
                        <CheckCircleIcon className="w-4 h-4 text-primary" />
                        {isTargetSelected ? t('deselectRow') : t('selectRow')}
                    </ContextMenuItem>
                )}
                {!limited && onEditCell && (
                    <ContextMenuItem onSelect={onEditCell} data-testid="context-menu-edit-row">
                        <PencilSquareIcon className="w-4 h-4" />
                        {t('editRow')}
                    </ContextMenuItem>
                )}
                {onExport && (
                    <ContextMenuSub>
                        <ContextMenuSubTrigger>
                            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                            {t('export')}
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent collisionPadding={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <ContextMenuItem onSelect={() =>{  onExport('csv', 'all'); }}>
                                <DocumentIcon className="w-4 h-4" />
                                {t('exportAllAsCsv')}
                            </ContextMenuItem>
                            <ContextMenuItem onSelect={() =>{  onExport('excel', 'all'); }}>
                                <DocumentIcon className="w-4 h-4" />
                                {t('exportAllAsExcel')}
                            </ContextMenuItem>
                            {!limited && (
                                <>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onSelect={() =>{  onExport('csv', 'selected'); }} disabled={selectedCount === 0}>
                                        <DocumentIcon className="w-4 h-4" />
                                        {t('exportSelectedAsCsv')}
                                    </ContextMenuItem>
                                    <ContextMenuItem onSelect={() =>{  onExport('excel', 'selected'); }} disabled={selectedCount === 0}>
                                        <DocumentIcon className="w-4 h-4" />
                                        {t('exportSelectedAsExcel')}
                                    </ContextMenuItem>
                                </>
                            )}
                        </ContextMenuSubContent>
                    </ContextMenuSub>
                )}
                {!limited && onMockData && (
                    <ContextMenuItem onSelect={onMockData}>
                        <DocumentDuplicateIcon className="w-4 h-4" />
                        {t('mockData')}
                    </ContextMenuItem>
                )}
                {!limited && onDeleteRow && (
                    <ContextMenuItem variant="destructive" onSelect={onDeleteRow} data-testid="context-menu-delete-row">
                        <TrashIcon className="w-4 h-4 text-destructive" />
                        {t('deleteRow')}
                    </ContextMenuItem>
                )}
                {!limited && onDeleteSelected && selectedCount > 1 && (
                    <ContextMenuItem variant="destructive" onSelect={onDeleteSelected}>
                        <TrashIcon className="w-4 h-4 text-destructive" />
                        {t('deleteRow')}
                    </ContextMenuItem>
                )}
            </ContextMenuContent>
        </ContextMenu>
    );
}
