import * as React from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
    className?: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    children?: React.ReactNode;
};

function EmptyState({ className, title, description, icon, children }: EmptyStateProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center gap-4 py-12 text-center", className)}>
            <div className="text-muted-foreground">{icon}</div>
            <div className="space-y-1">
                <h3 className="text-lg font-semibold">{title}</h3>
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
        </div>
    );
}

export { EmptyState };
