import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const spinnerVariants = cva(
    "animate-spin rounded-full border-2 border-current border-t-transparent",
    {
        variants: {
            variant: {
                default: "text-foreground",
                secondary: "text-secondary-foreground",
                destructive: "text-destructive",
                primary: "text-primary",
                muted: "text-muted-foreground",
            },
            size: {
                sm: "h-3 w-3",
                md: "h-4 w-4",
                default: "h-4 w-4",
                lg: "h-6 w-6",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement>, Omit<VariantProps<typeof spinnerVariants>, "size"> {
    size?: VariantProps<typeof spinnerVariants>["size"] | number;
}

function Spinner({ className, variant, size, ...props }: SpinnerProps) {
    const sizeClass = typeof size === "number" ? undefined : size;
    const inlineStyle = typeof size === "number" ? { width: size, height: size } : undefined;
    return (
        <div
            role="status"
            className={cn(spinnerVariants({ variant, size: sizeClass }), className)}
            style={inlineStyle}
            {...props}
        />
    );
}

export { Spinner, spinnerVariants };
