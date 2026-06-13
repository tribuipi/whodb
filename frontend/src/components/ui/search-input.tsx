import * as React from "react";
import { cn } from "@/lib/utils";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

function SearchInput({ className, ...props }: React.ComponentProps<"input">) {
    return (
        <div className="relative flex items-center">
            <MagnifyingGlassIcon className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
                type="search"
                className={cn(
                    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 pl-8 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            />
        </div>
    );
}

export { SearchInput };
