import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

type DataPaginationProps = {
    totalPages: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    siblingsCount?: number;
    className?: string;
    size?: "sm" | "default" | "lg" | "icon";
};

function getPageRange(current: number, total: number, siblings: number): (number | "...")[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const left = Math.max(2, current - siblings);
    const right = Math.min(total - 1, current + siblings);
    const pages: (number | "...")[] = [1];
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < total - 1) pages.push("...");
    pages.push(total);
    return pages;
}

function DataPagination({ totalPages, currentPage, onPageChange, siblingsCount = 1, className, size = "sm" }: DataPaginationProps) {
    if (totalPages <= 1) return null;
    const pages = getPageRange(currentPage, totalPages, siblingsCount);
    return (
        <nav className={cn("flex items-center gap-1", className)} aria-label="Pagination">
            <Button
                variant="outline"
                size={size === "sm" ? "icon" : size}
                className="h-7 w-7"
                onClick={() =>{  onPageChange(currentPage - 1); }}
                disabled={currentPage <= 1}
                aria-label="Previous page"
            >
                <ChevronLeftIcon className="h-3.5 w-3.5" />
            </Button>
            {pages.map((page, i) =>
                page === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                ) : (
                    <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size={size === "sm" ? "icon" : size}
                        className="h-7 w-7 text-xs"
                        onClick={() =>{  onPageChange(page as number); }}
                        aria-current={page === currentPage ? "page" : undefined}
                    >
                        {page}
                    </Button>
                )
            )}
            <Button
                variant="outline"
                size={size === "sm" ? "icon" : size}
                className="h-7 w-7"
                onClick={() =>{  onPageChange(currentPage + 1); }}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
            >
                <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
        </nav>
    );
}

export { DataPagination };
