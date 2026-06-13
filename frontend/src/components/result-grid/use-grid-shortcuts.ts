import { useEffect } from 'react';
import type { GridApi } from 'ag-grid-community';
import { matchesShortcut, SHORTCUTS } from '@/utils/shortcuts';

export interface UseGridShortcutsOptions {
    enabled: boolean;
    api: GridApi | null;
    onExport?: () => void;
    onImport?: () => void;
    onMockData?: () => void;
    onRefresh?: () => void;
    onEditFocused?: () => void;
    onDeleteFocused?: () => void;
    onNextPage?: () => void;
    onPrevPage?: () => void;
}

/** Registers WhoDB's app-level grid keyboard shortcuts (the non-native subset). */
export function useGridShortcuts(opts: UseGridShortcutsOptions): void {
    const { enabled, api, onExport, onImport, onMockData, onRefresh, onEditFocused, onDeleteFocused, onNextPage, onPrevPage } = opts;

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (matchesShortcut(event, SHORTCUTS.exportData)) {
                event.preventDefault();
                onExport?.();
                return;
            }
            if (matchesShortcut(event, SHORTCUTS.mockData)) {
                event.preventDefault();
                onMockData?.();
                return;
            }
            if (matchesShortcut(event, SHORTCUTS.importData)) {
                event.preventDefault();
                onImport?.();
                return;
            }
            if (matchesShortcut(event, SHORTCUTS.refresh)) {
                event.preventDefault();
                onRefresh?.();
                return;
            }
            if (matchesShortcut(event, SHORTCUTS.selectAll)) {
                event.preventDefault();
                api?.selectAll();
                return;
            }
            if (matchesShortcut(event, SHORTCUTS.nextPage)) {
                event.preventDefault();
                onNextPage?.();
                return;
            }
            if (matchesShortcut(event, SHORTCUTS.prevPage)) {
                event.preventDefault();
                onPrevPage?.();
                return;
            }
            if (matchesShortcut(event, SHORTCUTS.editRowAlt)) {
                event.preventDefault();
                onEditFocused?.();
                return;
            }
            if (matchesShortcut(event, SHORTCUTS.editRow)) {
                event.preventDefault();
                onEditFocused?.();
                return;
            }
            if (matchesShortcut(event, SHORTCUTS.deleteRow) || matchesShortcut(event, SHORTCUTS.deleteRowAlt)) {
                event.preventDefault();
                onDeleteFocused?.();
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => { window.removeEventListener('keydown', handleKeyDown); };
    }, [enabled, api, onExport, onImport, onMockData, onRefresh, onEditFocused, onDeleteFocused, onNextPage, onPrevPage]);
}
