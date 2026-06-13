import * as React from "react";
import { cn } from "@/lib/utils";

type StackListItemProps = {
    item: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    keyClassName?: string;
    valueClassName?: string;
    rowClassName?: string;
    itemClassName?: string;
};

function StackListItem({ item, children, className, keyClassName, valueClassName, rowClassName, itemClassName }: StackListItemProps) {
    return (
        <div className={cn("py-2", className)}>
            <div className={cn("flex items-center gap-2", rowClassName)}>
                <span className={cn("text-sm text-muted-foreground shrink-0 min-w-[80px]", keyClassName, itemClassName)}>
                    {item}
                </span>
                <span className={cn("text-sm flex-1 min-w-0", valueClassName)}>
                    {children}
                </span>
            </div>
        </div>
    );
}

type StackListProps = {
    children: React.ReactNode;
    className?: string;
    separatorClassName?: string;
};

function StackList({ children, className, separatorClassName }: StackListProps) {
    const childArray = React.Children.toArray(children);
    return (
        <div className={cn("divide-y divide-border", className)}>
            {childArray.map((child, i) => (
                <div key={i} className={cn(separatorClassName)}>
                    {child}
                </div>
            ))}
        </div>
    );
}

export { StackList, StackListItem };
