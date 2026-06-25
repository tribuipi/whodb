import type React from 'react';
import { useEffect, useState } from 'react';
import type { IHeaderParams } from 'ag-grid-community';
import { ChevronDownIcon, ChevronUpIcon, KeyIcon, ShareIcon } from '../heroicons';

export interface GridHeaderParams extends IHeaderParams {
    typeIcon?: React.ReactNode;
    isPrimary?: boolean;
    isForeignKey?: boolean;
    /** When set, clicking the header calls this (server-side sort) instead of native sort. */
    onServerSort?: () => void;
    serverSortDir?: 'asc' | 'desc';
}

/**
 * Header cell rendering the column's type icon, PK/FK badge, name, and sort arrow.
 * Sorting is server-side when `onServerSort` is provided, else native ag-grid sort.
 */
export function GridHeader(params: GridHeaderParams) {
    const { displayName, typeIcon, isPrimary, isForeignKey, onServerSort, serverSortDir } = params;
    const [, forceRender] = useState(0);

    // Native sort: ag-grid does not re-render custom headers on sort change, so the
    // arrow would go stale. Subscribe to the column's sortChanged event to refresh.
    useEffect(() => {
        if (onServerSort) return;
        const column = params.column;
        const onSortChanged = () => { forceRender(n => n + 1); };
        column.addEventListener('sortChanged', onSortChanged);
        return () => { column.removeEventListener('sortChanged', onSortChanged); };
    }, [params.column, onServerSort]);

    const handleClick = () => {
        if (onServerSort) { onServerSort(); return; }
        params.progressSort(false);
    };

    const dir = onServerSort
        ? serverSortDir
        : (params.column.getSort() ?? undefined);

    return (
        <div
            className="flex items-center gap-1 w-full cursor-pointer select-none"
            data-testid={`column-header-${displayName}`}
            data-column-name={displayName}
            data-sort-direction={dir || undefined}
            onClick={handleClick}
        >
            {typeIcon}
            <span className="truncate flex-1">{displayName}</span>
            {isPrimary && <KeyIcon className="w-3 h-3 opacity-70" />}
            {isForeignKey && <ShareIcon className="w-3 h-3 opacity-70" />}
            {dir && (
                <span data-testid="sort-indicator">
                    {dir === 'asc' ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
                </span>
            )}
        </div>
    );
}
