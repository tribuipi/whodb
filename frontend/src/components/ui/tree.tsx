import * as React from "react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import type { LucideIcon } from "lucide-react";

export interface TreeDataItem {
    id: string;
    name: string;
    icon?: LucideIcon;
    children?: TreeDataItem[];
}

type TreeProps = React.HTMLAttributes<HTMLDivElement> & {
    data: TreeDataItem[] | TreeDataItem;
    initialSelectedItemId?: string;
    onSelectChange?: (item: TreeDataItem | undefined) => void;
    expandAll?: boolean;
    expandedIds?: string[];
    onExpandChange?: (ids: string[]) => void;
    folderIcon?: LucideIcon;
    itemIcon?: LucideIcon;
};

function Tree({
    data,
    initialSelectedItemId,
    onSelectChange,
    expandAll = false,
    expandedIds: controlledExpandedIds,
    onExpandChange,
    folderIcon: FolderIcon,
    itemIcon: ItemIcon,
    className,
    ...props
}: TreeProps) {
    const [selectedId, setSelectedId] = useState<string | undefined>(initialSelectedItemId);
    const [internalExpandedIds, setInternalExpandedIds] = useState<string[]>([]);

    const expandedIds = controlledExpandedIds ?? internalExpandedIds;

    const handleSelect = useCallback((item: TreeDataItem) => {
        setSelectedId(item.id);
        onSelectChange?.(item);
    }, [onSelectChange]);

    const handleToggle = useCallback((id: string) => {
        const next = expandedIds.includes(id)
            ? expandedIds.filter((i) => i !== id)
            : [...expandedIds, id];
        if (!controlledExpandedIds) setInternalExpandedIds(next);
        onExpandChange?.(next);
    }, [expandedIds, controlledExpandedIds, onExpandChange]);

    const items = Array.isArray(data) ? data : [data];

    const renderItem = (item: TreeDataItem, depth = 0): React.ReactNode => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expandAll || expandedIds.includes(item.id);
        const isSelected = selectedId === item.id;
        const Icon = hasChildren ? FolderIcon : ItemIcon;

        return (
            <div key={item.id}>
                <div
                    className={cn(
                        "flex items-center gap-2 rounded-none px-3 py-2 text-sm cursor-default hover:bg-muted hover:text-foreground",
                        isSelected && "bg-muted text-foreground",
                    )}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    onClick={() => {
                        handleSelect(item);
                        if (hasChildren) handleToggle(item.id);
                    }}
                >
                    {hasChildren && (
                        <ChevronRightIcon
                            className={cn("h-3 w-3 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-90")}
                        />
                    )}
                    {!hasChildren && <span className="w-3" />}
                    {Icon && <Icon className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{item.name}</span>
                </div>
                {hasChildren && isExpanded && (
                    <div>
                        {item.children!.map((child) => renderItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={cn("select-none", className)} {...props}>
            {items.map((item) => renderItem(item))}
        </div>
    );
}

export { Tree };
