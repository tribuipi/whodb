import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

function TableHeadRow({ className, style, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b transition-colors", className)}
      style={style}
      {...props}
    />
  );
}

type VirtualizedTableBodyProps = {
  rowCount: number;
  rowHeight?: number | ((args: { index: number }) => number);
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  overscan?: number;
  children: (index: number, style: React.CSSProperties) => React.ReactNode;
};

function VirtualizedTableBody({
  rowCount,
  rowHeight = 40,
  height = 400,
  className,
  style,
  overscan = 3,
  children,
}: VirtualizedTableBodyProps) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | null>(null);

  const getRowHeight = (index: number) =>
    typeof rowHeight === "function" ? rowHeight({ index }) : rowHeight;

  const totalHeight = React.useMemo(() => {
    let total = 0;
    for (let i = 0; i < rowCount; i++) total += getRowHeight(i);
    return total;
  }, [rowCount, rowHeight]);

  const prefixSums = React.useMemo(() => {
    if (typeof rowHeight === "number") return null;
    const sums = new Array(rowCount + 1);
    sums[0] = 0;
    for (let i = 0; i < rowCount; i++) sums[i + 1] = sums[i] + getRowHeight(i);
    return sums;
  }, [rowCount, rowHeight]);

  const findStartIndex = (top: number): number => {
    if (typeof rowHeight === "number") return Math.floor(top / rowHeight);
    if (!prefixSums) return 0;
    let lo = 0, hi = rowCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (prefixSums[mid + 1] <= top) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  const startIndex = Math.max(0, findStartIndex(scrollTop) - overscan);
  let endIndex = startIndex;
  let accumulated = prefixSums ? prefixSums[startIndex] : startIndex * (rowHeight as number);
  while (endIndex < rowCount && accumulated - scrollTop < height + (typeof rowHeight === "number" ? rowHeight * overscan : 200)) {
    accumulated += getRowHeight(endIndex);
    endIndex++;
  }
  endIndex = Math.min(rowCount, endIndex + overscan);

  const handleScroll = React.useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
    });
  }, []);

  const offsetTop = prefixSums
    ? prefixSums[startIndex]
    : startIndex * (rowHeight as number);

  const rows: React.ReactNode[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    const h = getRowHeight(i);
    rows.push(children(i, { height: h }));
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto", className)}
      style={{ height, ...style }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <table style={{ position: "absolute", top: offsetTop, width: "100%" }}>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  );
}

export { TableHeadRow, VirtualizedTableBody };
