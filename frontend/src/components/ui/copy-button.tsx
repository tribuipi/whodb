import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type CopyButtonProps = Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
    text: string;
    onCopy?: () => void;
    tooltipLabel?: string;
    copiedLabel?: string;
};

function CopyButton({ text, onCopy, tooltipLabel = "Copy", copiedLabel = "Copied!", variant = "ghost", size = "icon", className, ...props }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            onCopy?.();
            setTimeout(() =>{  setCopied(false); }, 2000);
        } catch {
            // ignore
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger render={(triggerProps) => (
                    <Button
                        {...triggerProps}
                        variant={variant}
                        size={size}
                        className={cn("h-7 w-7", triggerProps.className, className)}
                        onClick={handleCopy}
                        {...props}
                    />
                )}>
                    {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardIcon className="h-3.5 w-3.5" />}
                </TooltipTrigger>
                <TooltipContent>
                    <p>{copied ? copiedLabel : tooltipLabel}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export { CopyButton };
