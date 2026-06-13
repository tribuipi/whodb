import { cn } from "@/lib/utils";
import type { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { CheckCircleIcon, ChevronUpDownIcon } from "./heroicons";

export interface SearchSelectOption {
    value: string;
    label: string;
    icon?: ReactNode;
    rightIcon?: ReactNode;
}

export interface SearchSelectProps {
    options: SearchSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    onValueChange?: (value: string) => void;
    notFoundMessage?: string;
    className?: string;
    buttonClassName?: string;
    contentClassName?: string;
    disabled?: boolean;
    /** Extra command items rendered after the filtered options (e.g. an "add" action). */
    extraOptions?: ReactNode;
    side?: "top" | "bottom" | "left" | "right";
    align?: "start" | "center" | "end";
    /** Collapse the trigger to show only the selected option's icon. */
    onlyIcon?: boolean;
    label?: string;
    inputProps?: ComponentProps<typeof CommandInput>;
    buttonProps?: ComponentProps<typeof Button>;
    rightIcon?: ReactNode;
}

/**
 * Searchable select built from Popover + Command. The trigger is rendered directly
 * as the Popover button (not a nested Button) so it produces a single `<button>` —
 * avoiding the button-in-button DOM nesting warning.
 */
export const SearchSelect = ({
    options,
    placeholder = "Select option...",
    searchPlaceholder = "Search...",
    value,
    defaultValue,
    onChange,
    onValueChange,
    notFoundMessage,
    className,
    buttonClassName,
    contentClassName,
    disabled = false,
    extraOptions,
    side = "bottom",
    align = "start",
    onlyIcon = false,
    label,
    inputProps,
    buttonProps,
    rightIcon = <ChevronUpDownIcon className="w-4 h-4" />,
}: SearchSelectProps) => {
    const [open, setOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(defaultValue ?? "");
    const [query, setQuery] = useState("");

    const selectedValue = value ?? internalValue;
    const selected = options.find(o => o.value === selectedValue);

    const filtered = useMemo(
        () => options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())),
        [options, query],
    );

    const handleSelect = (next: string) => {
        const resolved = next === selectedValue ? "" : next;
        if (value === undefined) setInternalValue(resolved);
        onChange?.(resolved);
        onValueChange?.(resolved);
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }} modal>
            <PopoverTrigger
                role="combobox"
                aria-expanded={open}
                disabled={disabled}
                className={cn(
                    buttonVariants({ variant: "outline" }),
                    "w-full justify-between overflow-hidden",
                    { "has-[>svg]:px-2 px-2": onlyIcon },
                    buttonClassName,
                    className,
                )}
                {...buttonProps}
            >
                <span
                    className={cn("flex items-center gap-2", {
                        "text-muted-foreground": !selected && !!placeholder,
                        "min-w-0 truncate": !onlyIcon,
                    })}
                >
                    {selected ? (
                        onlyIcon ? selected.icon : (
                            <>
                                {selected.icon}
                                <p className="grow truncate">{selected.label}</p>
                                {selected.rightIcon}
                            </>
                        )
                    ) : (
                        <span className="truncate">{placeholder}</span>
                    )}
                </span>
                {rightIcon}
            </PopoverTrigger>
            <PopoverContent className={cn("p-0", contentClassName)} side={side} align={align}>
                <Command shouldFilter={false}>
                    <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} {...inputProps} />
                    <CommandList>
                        <CommandEmpty>{notFoundMessage ?? `No ${label?.toLowerCase() ?? "option"} found.`}</CommandEmpty>
                        <CommandGroup>
                            {filtered.map(option => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => { handleSelect(option.value); }}
                                    className="break-all"
                                >
                                    <CheckCircleIcon className={cn("mr-2 h-4 w-4", selectedValue === option.value ? "opacity-100" : "opacity-0")} />
                                    {option.icon}
                                    <p className="grow truncate">{option.label}</p>
                                    {option.rightIcon}
                                </CommandItem>
                            ))}
                            {extraOptions}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};
