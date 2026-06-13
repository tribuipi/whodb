# Replace @clidey/ux with shadcn Components

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all `@clidey/ux` imports across 56 frontend files with equivalent shadcn components and custom component implementations.

**Architecture:** Initialize shadcn/ui in the existing Tailwind v4 project, add all standard shadcn components via CLI, implement custom components not available in shadcn (Spinner, Kbd, SearchInput, CopyButton, ModeToggle, Tree, DataPagination, StackList, EmptyState, ThemeProvider), update every import across the codebase, then remove the `@clidey/ux` dependency.

**Tech Stack:** React 18, Tailwind CSS 4, shadcn/ui, Radix UI, next-themes, sonner, cmdk, clsx, class-variance-authority

---

## Import Mapping Reference

Use this mapping throughout all tasks:

| From `@clidey/ux` | New import |
|---|---|
| `cn` | `@/lib/utils` |
| `toTitleCase` | `@/lib/utils` |
| `toast` | `sonner` |
| `Toaster` | `@/components/ui/sonner` |
| `ThemeProvider`, `useTheme` | `@/components/theme/provider` |
| `ModeToggle` | `@/components/ui/mode-toggle` |
| `Spinner`, `spinnerVariants` | `@/components/ui/spinner` |
| `Kbd` | `@/components/ui/kbd` |
| `SearchInput` | `@/components/ui/search-input` |
| `CopyButton` | `@/components/ui/copy-button` |
| `Tree`, `TreeDataItem` | `@/components/ui/tree` |
| `DataPagination` | `@/components/ui/data-pagination` |
| `StackList`, `StackListItem` | `@/components/ui/stack-list` |
| `EmptyState` | `@/components/ui/empty-state` |
| `VirtualizedTableBody`, `TableHeadRow` | `@/components/ui/table` (augmented) |
| `Alert`, `AlertDescription`, `AlertTitle` | `@/components/ui/alert` |
| `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogTrigger` | `@/components/ui/alert-dialog` |
| `Accordion`, `AccordionContent`, `AccordionItem`, `AccordionTrigger` | `@/components/ui/accordion` |
| `Badge`, `badgeVariants` | `@/components/ui/badge` |
| `Button`, `buttonVariants`, `type Button` | `@/components/ui/button` |
| `Card`, `CardContent`, `CardDescription`, `CardFooter`, `CardHeader`, `CardTitle` | `@/components/ui/card` |
| `Checkbox` | `@/components/ui/checkbox` |
| `Command`, `CommandEmpty`, `CommandGroup`, `CommandInput`, `CommandItem`, `CommandList` | `@/components/ui/command` |
| `ContextMenu`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuSeparator`, `ContextMenuSub`, `ContextMenuSubContent`, `ContextMenuSubTrigger`, `ContextMenuTrigger` | `@/components/ui/context-menu` |
| `Dialog`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogTitle`, `DialogTrigger` | `@/components/ui/dialog` |
| `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle` | `@/components/ui/drawer` |
| `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` | `@/components/ui/dropdown-menu` |
| `Input` | `@/components/ui/input` |
| `TextArea` | `@/components/ui/textarea` (note: renamed to `Textarea` in shadcn) |
| `Label` | `@/components/ui/label` |
| `Popover`, `PopoverContent`, `PopoverTrigger` | `@/components/ui/popover` |
| `ScrollArea`, `ScrollBar` | `@/components/ui/scroll-area` |
| `Select`, `SelectContent`, `SelectGroup`, `SelectItem`, `SelectLabel`, `SelectTrigger`, `SelectValue` | `@/components/ui/select` |
| `Separator` | `@/components/ui/separator` |
| `Sheet`, `SheetClose`, `SheetContent`, `SheetDescription`, `SheetFooter`, `SheetHeader`, `SheetTitle`, `SheetTrigger` | `@/components/ui/sheet` |
| `Sidebar`, `SidebarContent`, `SidebarFooter`, `SidebarGroup`, `SidebarGroupContent`, `SidebarGroupLabel`, `SidebarHeader`, `SidebarInput`, `SidebarMenu`, `SidebarMenuAction`, `SidebarMenuBadge`, `SidebarMenuButton`, `SidebarMenuItem`, `SidebarMenuSub`, `SidebarMenuSubButton`, `SidebarMenuSubItem`, `SidebarProvider`, `SidebarRail`, `SidebarSeparator`, `SidebarTrigger`, `useSidebar` | `@/components/ui/sidebar` |
| `Switch` | `@/components/ui/switch` |
| `Table`, `TableBody`, `TableCaption`, `TableCell`, `TableFooter`, `TableHead`, `TableHeader`, `TableRow` | `@/components/ui/table` |
| `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` | `@/components/ui/tabs` |
| `Tooltip`, `TooltipContent`, `TooltipProvider`, `TooltipTrigger` | `@/components/ui/tooltip` |

---

## Task 1: Install Direct Dependencies

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install next-themes, sonner, and supporting packages**

```bash
cd frontend
pnpm add next-themes sonner clsx class-variance-authority
```

Expected: packages added to `package.json` dependencies.

- [ ] **Step 2: Verify installation**

```bash
ls node_modules/next-themes node_modules/sonner node_modules/clsx node_modules/class-variance-authority
```

Expected: all 4 directories exist.

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/bun.lock
git commit -m "chore(deps): add next-themes, sonner, clsx, cva as direct deps"
```

---

## Task 2: Initialize shadcn

**Files:**
- Create: `frontend/components.json`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Create components.json**

Create `frontend/components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: Create src/lib/utils.ts**

Create `frontend/src/lib/utils.ts`:

```ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}
```

- [ ] **Step 3: Add shadcn CSS variables to src/index.css**

Open `frontend/src/index.css` and replace the line:

```css
@import '@clidey/ux/styles.css';
```

with the shadcn CSS variable block below. The replacement should go in the same position (after `@import 'tailwindcss'` and before the `@custom-variant` lines):

```css
@layer base {
  :root {
    --background: oklch(1 0 0);
    --foreground: oklch(0.145 0 0);
    --card: oklch(1 0 0);
    --card-foreground: oklch(0.145 0 0);
    --popover: oklch(1 0 0);
    --popover-foreground: oklch(0.145 0 0);
    --primary: oklch(0.205 0 0);
    --primary-foreground: oklch(0.985 0 0);
    --secondary: oklch(0.97 0 0);
    --secondary-foreground: oklch(0.205 0 0);
    --muted: oklch(0.97 0 0);
    --muted-foreground: oklch(0.556 0 0);
    --accent: oklch(0.97 0 0);
    --accent-foreground: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);
    --destructive-foreground: oklch(0.577 0.245 27.325);
    --border: oklch(0.922 0 0);
    --input: oklch(0.922 0 0);
    --ring: oklch(0.708 0 0);
    --chart-1: oklch(0.646 0.222 41.116);
    --chart-2: oklch(0.6 0.118 184.704);
    --chart-3: oklch(0.398 0.07 227.392);
    --chart-4: oklch(0.828 0.189 84.429);
    --chart-5: oklch(0.769 0.188 70.08);
    --radius: 0.625rem;
    --sidebar: oklch(0.985 0 0);
    --sidebar-foreground: oklch(0.145 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.97 0 0);
    --sidebar-accent-foreground: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
    --sidebar-ring: oklch(0.708 0 0);
  }
  .dark {
    --background: oklch(0.145 0 0);
    --foreground: oklch(0.985 0 0);
    --card: oklch(0.205 0 0);
    --card-foreground: oklch(0.985 0 0);
    --popover: oklch(0.205 0 0);
    --popover-foreground: oklch(0.985 0 0);
    --primary: oklch(0.922 0 0);
    --primary-foreground: oklch(0.205 0 0);
    --secondary: oklch(0.269 0 0);
    --secondary-foreground: oklch(0.985 0 0);
    --muted: oklch(0.269 0 0);
    --muted-foreground: oklch(0.708 0 0);
    --accent: oklch(0.269 0 0);
    --accent-foreground: oklch(0.985 0 0);
    --destructive: oklch(0.704 0.191 22.216);
    --destructive-foreground: oklch(0.704 0.191 22.216);
    --border: oklch(1 0 0 / 10%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.556 0 0);
    --chart-1: oklch(0.488 0.243 264.376);
    --chart-2: oklch(0.696 0.17 162.48);
    --chart-3: oklch(0.769 0.188 70.08);
    --chart-4: oklch(0.627 0.265 303.9);
    --chart-5: oklch(0.645 0.246 16.439);
    --sidebar: oklch(0.205 0 0);
    --sidebar-foreground: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.488 0.243 264.376);
    --sidebar-primary-foreground: oklch(0.985 0 0);
    --sidebar-accent: oklch(0.269 0 0);
    --sidebar-accent-foreground: oklch(0.985 0 0);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.556 0 0);
  }
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/components.json frontend/src/lib/utils.ts frontend/src/index.css
git commit -m "chore(shadcn): init config, utils, and CSS variables"
```

---

## Task 3: Add shadcn Standard Components via CLI

**Files:**
- Create: `frontend/src/components/ui/` (many files)

- [ ] **Step 1: Add all standard shadcn components**

```bash
cd frontend
pnpm dlx shadcn@latest add accordion alert alert-dialog badge button card checkbox command context-menu dialog drawer dropdown-menu input label popover scroll-area select separator sheet sidebar sonner switch table tabs textarea tooltip --yes
```

Expected: `src/components/ui/` is populated with component files. This may take a minute.

- [ ] **Step 2: Verify components were created**

```bash
ls frontend/src/components/ui/
```

Expected: Should include `alert.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `command.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `popover.tsx`, `scroll-area.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`, `sonner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx`, `tooltip.tsx`, `accordion.tsx`, `alert-dialog.tsx`, `checkbox.tsx`, `context-menu.tsx`.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/ frontend/package.json frontend/bun.lock
git commit -m "chore(shadcn): add standard shadcn UI components"
```

---

## Task 4: Create Custom Components — Spinner, Kbd, SearchInput

**Files:**
- Create: `frontend/src/components/ui/spinner.tsx`
- Create: `frontend/src/components/ui/kbd.tsx`
- Create: `frontend/src/components/ui/search-input.tsx`

- [ ] **Step 1: Create spinner.tsx**

```tsx
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

import * as React from "react";

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
```

- [ ] **Step 2: Create kbd.tsx**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
    return (
        <kbd
            className={cn(
                "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100",
                className
            )}
            {...props}
        />
    );
}

export { Kbd };
```

- [ ] **Step 3: Create search-input.tsx**

```tsx
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
```

- [ ] **Step 4: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | head -30
```

Expected: No errors in the new files.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/spinner.tsx frontend/src/components/ui/kbd.tsx frontend/src/components/ui/search-input.tsx
git commit -m "feat(ui): add Spinner, Kbd, SearchInput custom components"
```

---

## Task 5: Create Custom Components — CopyButton, ModeToggle, ThemeProvider

**Files:**
- Create: `frontend/src/components/ui/copy-button.tsx`
- Create: `frontend/src/components/ui/mode-toggle.tsx`
- Create: `frontend/src/components/theme/provider.tsx`

- [ ] **Step 1: Create copy-button.tsx**

```tsx
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
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant={variant}
                        size={size}
                        className={cn("h-7 w-7", className)}
                        onClick={handleCopy}
                        {...props}
                    >
                        {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <ClipboardIcon className="h-3.5 w-3.5" />}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{copied ? copiedLabel : tooltipLabel}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

export { CopyButton };
```

- [ ] **Step 2: Create src/components/theme/provider.tsx**

```tsx
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ComponentProps } from "react";

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

function ThemeProvider({ children, defaultTheme = "system", storageKey = "vite-ui-theme", ...props }: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme={defaultTheme}
            storageKey={storageKey}
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}

export { ThemeProvider, useTheme };
```

- [ ] **Step 3: Create mode-toggle.tsx**

```tsx
import { useTheme } from "@/components/theme/provider";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";

function ModeToggle() {
    const { theme, setTheme } = useTheme();

    const toggle = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            <SunIcon className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
    );
}

export { ModeToggle };
```

- [ ] **Step 4: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | head -30
```

Expected: No errors in the new files.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/copy-button.tsx frontend/src/components/ui/mode-toggle.tsx frontend/src/components/theme/
git commit -m "feat(ui): add CopyButton, ModeToggle, ThemeProvider custom components"
```

---

## Task 6: Create Custom Components — Tree, DataPagination, StackList, EmptyState

**Files:**
- Create: `frontend/src/components/ui/tree.tsx`
- Create: `frontend/src/components/ui/data-pagination.tsx`
- Create: `frontend/src/components/ui/stack-list.tsx`
- Create: `frontend/src/components/ui/empty-state.tsx`

- [ ] **Step 1: Create tree.tsx**

```tsx
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
                        "flex items-center gap-1 rounded-md px-2 py-1 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                        isSelected && "bg-accent text-accent-foreground font-medium",
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
```

- [ ] **Step 2: Create data-pagination.tsx**

```tsx
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
                onClick={() => onPageChange(currentPage - 1)}
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
                        onClick={() => onPageChange(page as number)}
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
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                aria-label="Next page"
            >
                <ChevronRightIcon className="h-3.5 w-3.5" />
            </Button>
        </nav>
    );
}

export { DataPagination };
```

- [ ] **Step 3: Create stack-list.tsx**

```tsx
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
```

- [ ] **Step 4: Create empty-state.tsx**

```tsx
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
```

- [ ] **Step 5: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | head -30
```

Expected: No errors in the new files.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ui/tree.tsx frontend/src/components/ui/data-pagination.tsx frontend/src/components/ui/stack-list.tsx frontend/src/components/ui/empty-state.tsx
git commit -m "feat(ui): add Tree, DataPagination, StackList, EmptyState custom components"
```

---

## Task 7: Augment shadcn Table with VirtualizedTableBody and TableHeadRow

**Files:**
- Modify: `frontend/src/components/ui/table.tsx`

- [ ] **Step 1: Read the generated table.tsx**

Read `frontend/src/components/ui/table.tsx` to see the current content. You need to append two exports at the end of the file.

- [ ] **Step 2: Add TableHeadRow and VirtualizedTableBody exports**

Append the following to the end of `frontend/src/components/ui/table.tsx`:

```tsx
// TableHeadRow: a <tr> for use inside <thead>
function TableHeadRow({ className, style, ...props }: React.ComponentProps<"tr">) {
    return (
        <tr
            className={cn("border-b transition-colors", className)}
            style={style}
            {...props}
        />
    );
}

// VirtualizedTableBody: renders only visible rows for large datasets
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

    const findStartIndex = (scrollTop: number): number => {
        if (typeof rowHeight === "number") return Math.floor(scrollTop / rowHeight);
        if (!prefixSums) return 0;
        let lo = 0, hi = rowCount - 1;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (prefixSums[mid + 1] <= scrollTop) lo = mid + 1;
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
```

- [ ] **Step 3: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/table.tsx
git commit -m "feat(ui): augment shadcn table with TableHeadRow and VirtualizedTableBody"
```

---

## Task 8: Update Root and Config Files

**Files:**
- Modify: `frontend/src/index.tsx`
- Modify: `frontend/src/app.tsx`
- Modify: `frontend/src/config/graphql-client.ts`

- [ ] **Step 1: Update src/index.tsx**

Replace:
```tsx
import {ThemeProvider} from '@clidey/ux'
```
with:
```tsx
import {ThemeProvider} from '@/components/theme/provider';
```

- [ ] **Step 2: Update src/app.tsx**

Replace:
```tsx
import {Toaster} from "@clidey/ux";
```
with:
```tsx
import {Toaster} from "@/components/ui/sonner";
```

- [ ] **Step 3: Update src/config/graphql-client.ts**

Replace:
```ts
import {toast} from '@clidey/ux';
```
with:
```ts
import {toast} from 'sonner';
```

- [ ] **Step 4: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.tsx frontend/src/app.tsx frontend/src/config/graphql-client.ts
git commit -m "refactor(imports): update root/config files to use shadcn components"
```

---

## Task 9: Update Hooks

**Files:**
- Modify: `frontend/src/hooks/use-page-size.ts`
- Modify: `frontend/src/hooks/use-profile-switch.ts`
- Modify: `frontend/src/components/result-grid/use-grid-theme.ts`

- [ ] **Step 1: Update use-page-size.ts**

Replace:
```ts
import {toast} from "@clidey/ux";
```
with:
```ts
import {toast} from "sonner";
```

- [ ] **Step 2: Update use-profile-switch.ts**

Replace:
```ts
import { toast } from '@clidey/ux';
```
with:
```ts
import { toast } from 'sonner';
```

- [ ] **Step 3: Update use-grid-theme.ts**

Replace:
```ts
import { useTheme } from '@clidey/ux';
```
with:
```ts
import { useTheme } from '@/components/theme/provider';
```

- [ ] **Step 4: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/use-page-size.ts frontend/src/hooks/use-profile-switch.ts frontend/src/components/result-grid/use-grid-theme.ts
git commit -m "refactor(imports): update hooks to use shadcn components"
```

---

## Task 10: Update Simple Components

**Files:**
- Modify: `frontend/src/components/loading.tsx`
- Modify: `frontend/src/components/error-boundary.tsx`
- Modify: `frontend/src/components/tip.tsx`
- Modify: `frontend/src/components/type-selector.tsx`
- Modify: `frontend/src/components/source-advanced-fields.tsx`
- Modify: `frontend/src/components/source-connection-fields.tsx`
- Modify: `frontend/src/components/analytics/posthog-consent-banner.tsx`
- Modify: `frontend/src/components/tour/tour-tooltip.tsx`

- [ ] **Step 1: Update loading.tsx**

Replace:
```tsx
import {Spinner} from "@clidey/ux";
```
with:
```tsx
import {Spinner} from "@/components/ui/spinner";
```

- [ ] **Step 2: Update error-boundary.tsx**

Replace:
```tsx
import {Button} from "@clidey/ux";
```
with:
```tsx
import {Button} from "@/components/ui/button";
```

- [ ] **Step 3: Update tip.tsx**

Replace:
```tsx
import {cn, Tooltip, TooltipContent, TooltipTrigger} from "@clidey/ux";
```
with:
```tsx
import {cn} from "@/lib/utils";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
```

- [ ] **Step 4: Update type-selector.tsx**

Replace:
```tsx
import { Input, Label } from '@clidey/ux';
```
with:
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
```

- [ ] **Step 5: Update source-advanced-fields.tsx**

Replace:
```tsx
import { Input, Label, Switch } from '@clidey/ux';
```
with:
```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
```

- [ ] **Step 6: Update source-connection-fields.tsx**

Replace:
```tsx
import { Button, cn, Input, Label, Switch } from '@clidey/ux';
```
with:
```tsx
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
```

- [ ] **Step 7: Update posthog-consent-banner.tsx**

Replace:
```tsx
import {Button, cn} from '@clidey/ux';
```
with:
```tsx
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
```

- [ ] **Step 8: Update tour-tooltip.tsx**

Replace:
```tsx
import { Badge, Button, Card } from '@clidey/ux';
```
with:
```tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

- [ ] **Step 9: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/loading.tsx frontend/src/components/error-boundary.tsx frontend/src/components/tip.tsx frontend/src/components/type-selector.tsx frontend/src/components/source-advanced-fields.tsx frontend/src/components/source-connection-fields.tsx frontend/src/components/analytics/posthog-consent-banner.tsx frontend/src/components/tour/tour-tooltip.tsx
git commit -m "refactor(imports): update simple components to use shadcn"
```

---

## Task 11: Update Error, Alert, and SSL Components

**Files:**
- Modify: `frontend/src/components/error-state.tsx`
- Modify: `frontend/src/components/ssl-config.tsx`
- Modify: `frontend/src/components/health/health-overlays.tsx`
- Modify: `frontend/src/components/graph/graph.tsx`

- [ ] **Step 1: Update error-state.tsx**

Replace:
```tsx
import {Alert, AlertDescription, AlertTitle, CopyButton, toast} from "@clidey/ux";
```
with:
```tsx
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CopyButton } from "@/components/ui/copy-button";
```

- [ ] **Step 2: Update ssl-config.tsx**

Read the file and find the import block:
```tsx
import { Alert, AlertDescription, Button, Input, Label, TextArea, cn } from '@clidey/ux';
```
Replace with:
```tsx
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
```

Also in ssl-config.tsx, replace all JSX uses of `<TextArea` with `<Textarea` (shadcn naming).

- [ ] **Step 3: Update health-overlays.tsx**

Replace:
```tsx
import { Button, cn, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from '@clidey/ux';
```
with:
```tsx
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```

- [ ] **Step 4: Update components/graph/graph.tsx**

Replace:
```tsx
import { Button, Tabs, TabsList, TabsTrigger } from '@clidey/ux';
```
with:
```tsx
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
```

- [ ] **Step 5: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/error-state.tsx frontend/src/components/ssl-config.tsx frontend/src/components/health/health-overlays.tsx frontend/src/components/graph/graph.tsx
git commit -m "refactor(imports): update error, ssl, health, graph components to use shadcn"
```

---

## Task 12: Update Breadcrumbs, Card, Command Palette

**Files:**
- Modify: `frontend/src/components/breadcrumbs.tsx`
- Modify: `frontend/src/components/card.tsx`
- Modify: `frontend/src/components/command-palette.tsx`

- [ ] **Step 1: Update breadcrumbs.tsx**

Read the file to find the imports. The import block imports:
```tsx
Breadcrumb as UxBreadcrumb,
BreadcrumbItem,
BreadcrumbLink,
BreadcrumbList,
BreadcrumbPage,
BreadcrumbSeparator
```
from `@clidey/ux`. Replace with:
```tsx
import {
    Breadcrumb as UxBreadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
```

Note: shadcn includes breadcrumb. Verify `src/components/ui/breadcrumb.tsx` exists after Task 3; if not, run:
```bash
cd frontend && pnpm dlx shadcn@latest add breadcrumb --yes
```

- [ ] **Step 2: Update card.tsx**

Read the file to find the import block from `@clidey/ux`:
```tsx
Badge,
Card as UxCard,
CardContent,
CardHeader,
cn,
Sheet,
SheetContent,
SheetTitle,
Spinner
```
Replace with:
```tsx
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card as UxCard, CardContent, CardHeader } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
```

- [ ] **Step 3: Update command-palette.tsx**

Replace the import block:
```tsx
Command,
CommandEmpty,
CommandGroup,
CommandInput,
CommandItem,
CommandList,
Dialog,
DialogContent
```
with:
```tsx
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
```

- [ ] **Step 4: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/breadcrumbs.tsx frontend/src/components/card.tsx frontend/src/components/command-palette.tsx
git commit -m "refactor(imports): update breadcrumbs, card, command-palette to use shadcn"
```

---

## Task 13: Update Editor, Page, Keyboard Shortcuts Help

**Files:**
- Modify: `frontend/src/components/editor.tsx`
- Modify: `frontend/src/components/page.tsx`
- Modify: `frontend/src/components/keyboard-shortcuts-help.tsx`

- [ ] **Step 1: Update editor.tsx**

Replace:
```tsx
import {useTheme} from "@clidey/ux";
```
with:
```tsx
import {useTheme} from "@/components/theme/provider";
```

- [ ] **Step 2: Update page.tsx**

Replace:
```tsx
import {Button, ModeToggle, SidebarProvider, Tooltip, TooltipContent, TooltipTrigger} from "@clidey/ux";
```
with:
```tsx
import {Button} from "@/components/ui/button";
import {ModeToggle} from "@/components/ui/mode-toggle";
import {SidebarProvider} from "@/components/ui/sidebar";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
```

- [ ] **Step 3: Update keyboard-shortcuts-help.tsx**

Replace:
```tsx
import {Dialog, DialogContent, DialogHeader, DialogTitle, Kbd, SearchInput,} from "@clidey/ux";
```
with:
```tsx
import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {Kbd} from "@/components/ui/kbd";
import {SearchInput} from "@/components/ui/search-input";
```

- [ ] **Step 4: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/editor.tsx frontend/src/components/page.tsx frontend/src/components/keyboard-shortcuts-help.tsx
git commit -m "refactor(imports): update editor, page, keyboard-shortcuts-help to use shadcn"
```

---

## Task 14: Update AI Component

**Files:**
- Modify: `frontend/src/components/ai.tsx`

- [ ] **Step 1: Read current imports**

Read `frontend/src/components/ai.tsx` lines 18-43 to see exact current imports.

- [ ] **Step 2: Replace @clidey/ux imports**

The file imports:
```tsx
AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
Button, cn, CommandItem, Input, Label,
Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
Sheet, SheetContent, Separator, SheetFooter, toast
```
Replace with:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CommandItem } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetFooter } from "@/components/ui/sheet";
```

- [ ] **Step 3: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ai.tsx
git commit -m "refactor(imports): update ai component to use shadcn"
```

---

## Task 15: Update Export and Import-Data Components

**Files:**
- Modify: `frontend/src/components/export.tsx`
- Modify: `frontend/src/components/import-data.tsx`

- [ ] **Step 1: Update export.tsx**

Read the file to get the full import block from @clidey/ux (lines ~17-30):
```tsx
Button, Label,
Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
Sheet, SheetContent, SheetFooter, SheetTitle, toast
```
Replace with:
```tsx
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetTitle } from "@/components/ui/sheet";
```

- [ ] **Step 2: Update import-data.tsx**

Read the file to get the full import block (lines ~17-32):
```tsx
Button, Checkbox, Input, Label,
Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
Sheet, SheetContent, SheetFooter, SheetTitle, toast
```
Replace with:
```tsx
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetTitle } from "@/components/ui/sheet";
```

- [ ] **Step 3: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/export.tsx frontend/src/components/import-data.tsx
git commit -m "refactor(imports): update export, import-data to use shadcn"
```

---

## Task 16: Update Sidebar and Schema Viewer

**Files:**
- Modify: `frontend/src/components/sidebar/sidebar.tsx`
- Modify: `frontend/src/components/schema-viewer.tsx`

- [ ] **Step 1: Update sidebar/sidebar.tsx**

Read the file to see the full import block from @clidey/ux (lines 18-48):
```tsx
Button, cn, CommandItem,
Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
Sheet, SheetContent, SheetTitle,
Sidebar as SidebarComponent, SidebarContent, SidebarGroup, SidebarHeader,
SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, SidebarTrigger,
Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, useSidebar
```
Replace with:
```tsx
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
    Sidebar as SidebarComponent, SidebarContent, SidebarGroup, SidebarHeader,
    SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
```

- [ ] **Step 2: Update schema-viewer.tsx**

Read the file to see the import block (lines 18-28):
```tsx
SearchInput,
Sidebar as SidebarComponent,
SidebarContent, SidebarGroup, SidebarHeader,
toTitleCase, Tree, TreeDataItem
```
Replace with:
```tsx
import { toTitleCase } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";
import { Sidebar as SidebarComponent, SidebarContent, SidebarGroup, SidebarHeader } from "@/components/ui/sidebar";
import { Tree, type TreeDataItem } from "@/components/ui/tree";
```

- [ ] **Step 3: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/sidebar/sidebar.tsx frontend/src/components/schema-viewer.tsx
git commit -m "refactor(imports): update sidebar and schema-viewer to use shadcn"
```

---

## Task 17: Update Result Grid Components

**Files:**
- Modify: `frontend/src/components/result-grid/grid-context-menu.tsx`
- Modify: `frontend/src/components/result-grid/mock-data-sheet.tsx`
- Modify: `frontend/src/components/result-grid/result-grid.tsx`

- [ ] **Step 1: Update grid-context-menu.tsx**

Read the file to get the import block (lines 3-5). It imports:
```tsx
ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger
```
Replace with:
```tsx
import {
    ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
    ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
```

- [ ] **Step 2: Update mock-data-sheet.tsx**

Read the file to get the full import block (lines 9-15):
```tsx
Alert, AlertDescription, AlertTitle,
Button, Input, Label,
Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
Sheet, SheetContent, SheetFooter, SheetTitle,
Spinner, toast
```
Replace with:
```tsx
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
```

- [ ] **Step 3: Update result-grid.tsx**

Read the file to get the import block (lines 4-8):
```tsx
AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
Button, DataPagination, Spinner, toast
```
Replace with:
```tsx
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { DataPagination } from '@/components/ui/data-pagination';
import { Spinner } from '@/components/ui/spinner';
```

- [ ] **Step 4: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/result-grid/grid-context-menu.tsx frontend/src/components/result-grid/mock-data-sheet.tsx frontend/src/components/result-grid/result-grid.tsx
git commit -m "refactor(imports): update result-grid components to use shadcn"
```

---

## Task 18: Update Cloud Provider Components (AWS)

**Files:**
- Modify: `frontend/src/components/aws/aws-connection-picker.tsx`
- Modify: `frontend/src/components/aws/aws-provider-modal.tsx`
- Modify: `frontend/src/components/aws/aws-providers-section.tsx`
- Modify: `frontend/src/components/aws/database-icon-with-badge.tsx`

- [ ] **Step 1: Update aws-connection-picker.tsx**

Replace the import from `@clidey/ux` (imports `Badge, Button, cn, Label, Popover, PopoverContent, PopoverTrigger, toast`) with:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

- [ ] **Step 2: Update aws-provider-modal.tsx**

Replace the import from `@clidey/ux` (imports `Badge, Button, cn, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Separator, Switch, toast`) with:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
```

- [ ] **Step 3: Update aws-providers-section.tsx**

Replace:
```tsx
import { Badge, Button, cn, toast } from "@clidey/ux";
```
with:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
```

- [ ] **Step 4: Update database-icon-with-badge.tsx**

Replace:
```tsx
import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@clidey/ux";
```
with:
```tsx
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
```

- [ ] **Step 5: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/aws/
git commit -m "refactor(imports): update AWS components to use shadcn"
```

---

## Task 19: Update Cloud Provider Components (Azure and GCP)

**Files:**
- Modify: `frontend/src/components/azure/azure-connection-picker.tsx`
- Modify: `frontend/src/components/azure/azure-provider-modal.tsx`
- Modify: `frontend/src/components/azure/azure-providers-section.tsx`
- Modify: `frontend/src/components/gcp/gcp-connection-picker.tsx`
- Modify: `frontend/src/components/gcp/gcp-provider-modal.tsx`
- Modify: `frontend/src/components/gcp/gcp-providers-section.tsx`

- [ ] **Step 1: Update azure-connection-picker.tsx**

Same pattern as `aws-connection-picker.tsx` — replace `@clidey/ux` imports for `Badge, Button, cn, Label, Popover, PopoverContent, PopoverTrigger, toast`:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

- [ ] **Step 2: Update azure-provider-modal.tsx**

Same pattern as `aws-provider-modal.tsx` — replace `@clidey/ux` imports for `Badge, Button, cn, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Separator, Switch, toast`:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
```

- [ ] **Step 3: Update azure-providers-section.tsx**

Replace:
```tsx
import { Badge, Button, cn, toast } from "@clidey/ux";
```
with:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
```

- [ ] **Step 4: Update gcp-connection-picker.tsx**

Same pattern as `aws-connection-picker.tsx` — replace `@clidey/ux` imports:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

- [ ] **Step 5: Update gcp-provider-modal.tsx**

Same pattern as `aws-provider-modal.tsx`:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
```

- [ ] **Step 6: Update gcp-providers-section.tsx**

Replace:
```tsx
import { Badge, Button, cn, toast } from "@clidey/ux";
```
with:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
```

- [ ] **Step 7: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/azure/ frontend/src/components/gcp/
git commit -m "refactor(imports): update Azure and GCP components to use shadcn"
```

---

## Task 20: Update Auth Pages

**Files:**
- Modify: `frontend/src/pages/auth/login.tsx`
- Modify: `frontend/src/pages/auth/logout.tsx`

- [ ] **Step 1: Update login.tsx**

Replace:
```tsx
import {Badge, Button, Card, cn, Label, ModeToggle, Separator, toast, useTheme} from '@clidey/ux';
```
with:
```tsx
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme/provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { Separator } from '@/components/ui/separator';
```

- [ ] **Step 2: Update logout.tsx**

Replace:
```tsx
import { toast } from "@clidey/ux";
```
with:
```tsx
import { toast } from "sonner";
```

- [ ] **Step 3: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/auth/login.tsx frontend/src/pages/auth/logout.tsx
git commit -m "refactor(imports): update auth pages to use shadcn"
```

---

## Task 21: Update Settings and Contact Pages

**Files:**
- Modify: `frontend/src/pages/settings/settings.tsx`
- Modify: `frontend/src/pages/contact-us/contact-us.tsx`

- [ ] **Step 1: Update settings.tsx**

Read the file and find the import block from `@clidey/ux` (lines ~26-36):
```tsx
Input, Label,
Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
Separator, Switch
```
Replace with:
```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
```

- [ ] **Step 2: Update contact-us.tsx**

Replace:
```tsx
import {Badge, Button, Label, Separator} from "@clidey/ux";
```
with:
```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
```

- [ ] **Step 3: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/settings/settings.tsx frontend/src/pages/contact-us/contact-us.tsx
git commit -m "refactor(imports): update settings and contact pages to use shadcn"
```

---

## Task 22: Update Raw Execute Pages

**Files:**
- Modify: `frontend/src/pages/raw-execute/sql-tab.tsx`
- Modify: `frontend/src/pages/raw-execute/query-view.tsx`
- Modify: `frontend/src/pages/raw-execute/chat-panel.tsx`

- [ ] **Step 1: Update sql-tab.tsx**

Replace the import block (lines 3-13):
```tsx
AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
Button
```
with:
```tsx
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
```

- [ ] **Step 2: Update query-view.tsx**

Replace:
```tsx
import {Button} from "@clidey/ux";
```
with:
```tsx
import {Button} from "@/components/ui/button";
```

- [ ] **Step 3: Update chat-panel.tsx**

Read the file to get the full import block (lines 2-17):
```tsx
Alert, AlertDescription, AlertTitle,
Button, Card, Checkbox, cn,
DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
EmptyState, Input, toast
```
Replace with:
```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
```

- [ ] **Step 4: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/raw-execute/sql-tab.tsx frontend/src/pages/raw-execute/query-view.tsx frontend/src/pages/raw-execute/chat-panel.tsx
git commit -m "refactor(imports): update raw-execute pages to use shadcn"
```

---

## Task 23: Update Graph Page

**Files:**
- Modify: `frontend/src/pages/graph/graph.tsx`

- [ ] **Step 1: Read the current import block**

Read `frontend/src/pages/graph/graph.tsx` lines 40-51. The imports from `@clidey/ux` are:
```tsx
Button, Checkbox, cn, EmptyState, SearchInput,
Sidebar as SidebarComponent, SidebarContent, SidebarGroup, SidebarHeader,
toTitleCase
```

- [ ] **Step 2: Replace imports**

```tsx
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { Sidebar as SidebarComponent, SidebarContent, SidebarGroup, SidebarHeader } from "@/components/ui/sidebar";
```

- [ ] **Step 3: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/graph/graph.tsx
git commit -m "refactor(imports): update graph page to use shadcn"
```

---

## Task 24: Update Storage Unit Pages (Part 1)

**Files:**
- Modify: `frontend/src/pages/storage-unit/explore-storage-unit-where-condition.tsx`
- Modify: `frontend/src/pages/storage-unit/explore-storage-unit-where-condition-sheet.tsx`
- Modify: `frontend/src/pages/storage-unit/create-source-object-card.tsx`

- [ ] **Step 1: Update explore-storage-unit-where-condition.tsx**

Read the file to get the import block (lines 17-30):
```tsx
Badge, Button, cn, Input, Label,
Popover, PopoverContent, PopoverTrigger,
Sheet, SheetContent, SheetFooter, SheetTitle
```
Replace with:
```tsx
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetFooter, SheetTitle } from "@/components/ui/sheet";
```

- [ ] **Step 2: Update explore-storage-unit-where-condition-sheet.tsx**

Read the file to get the import block (lines 17-25):
```tsx
Button, Input, Label,
Sheet, SheetContent, SheetFooter, SheetTitle
```
Replace with:
```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetTitle } from "@/components/ui/sheet";
```

- [ ] **Step 3: Update create-source-object-card.tsx**

Read the file to get the import block (lines 18-35):
```tsx
Accordion, AccordionContent, AccordionItem, AccordionTrigger,
Button, Checkbox, Input, Label,
Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
Separator, SheetTitle, toast
```
Replace with:
```tsx
import { toast } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SheetTitle } from "@/components/ui/sheet";
```

Wait — `toast` in create-source-object-card.tsx comes from `sonner`, not `@/lib/utils`. Correct the import:
```tsx
import { toast } from "sonner";
```

- [ ] **Step 4: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/storage-unit/explore-storage-unit-where-condition.tsx frontend/src/pages/storage-unit/explore-storage-unit-where-condition-sheet.tsx frontend/src/pages/storage-unit/create-source-object-card.tsx
git commit -m "refactor(imports): update storage-unit where-condition and create-card to use shadcn"
```

---

## Task 25: Update explore-storage-unit.tsx

**Files:**
- Modify: `frontend/src/pages/storage-unit/explore-storage-unit.tsx`

- [ ] **Step 1: Read the import block**

Read `frontend/src/pages/storage-unit/explore-storage-unit.tsx` lines 17-46.

The imports from `@clidey/ux` are:
```tsx
AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
Badge, Button, cn,
Drawer, DrawerContent, DrawerHeader, DrawerTitle,
Input, Label,
Select, SelectContent, SelectItem, SelectTrigger,
Sheet, SheetContent, SheetFooter, SheetTitle,
StackList, StackListItem, toast
```

- [ ] **Step 2: Replace the import block**

```tsx
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetTitle } from "@/components/ui/sheet";
import { StackList, StackListItem } from "@/components/ui/stack-list";
```

- [ ] **Step 3: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/storage-unit/explore-storage-unit.tsx
git commit -m "refactor(imports): update explore-storage-unit to use shadcn"
```

---

## Task 26: Update storage-unit.tsx

**Files:**
- Modify: `frontend/src/pages/storage-unit/storage-unit.tsx`

- [ ] **Step 1: Read the import block**

Read `frontend/src/pages/storage-unit/storage-unit.tsx` lines 17-36.

The imports from `@clidey/ux` are:
```tsx
Badge, Button, cn, SearchInput, SheetTitle,
StackList, StackListItem,
Table, TableCell, TableHead, TableHeader, TableHeadRow, TableRow,
Tabs, TabsList, TabsTrigger, VirtualizedTableBody
```

- [ ] **Step 2: Replace the import block**

```tsx
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { SheetTitle } from "@/components/ui/sheet";
import { StackList, StackListItem } from "@/components/ui/stack-list";
import {
    Table, TableCell, TableHead, TableHeader, TableHeadRow, TableRow, VirtualizedTableBody,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
```

- [ ] **Step 3: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/storage-unit/storage-unit.tsx
git commit -m "refactor(imports): update storage-unit to use shadcn"
```

---

## Task 27: Update ux.tsx (SearchSelect Component)

**Files:**
- Modify: `frontend/src/components/ux.tsx`

- [ ] **Step 1: Read current ux.tsx**

Read `frontend/src/components/ux.tsx`. The current imports at lines 1-14 are:
```tsx
import {
    buttonVariants, cn,
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
    Popover, PopoverContent, PopoverTrigger,
    type Button,
} from "@clidey/ux";
```

- [ ] **Step 2: Replace the import block**

```tsx
import { cn, buttonVariants } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ComponentProps as ButtonComponentProps } from "react";
import { Button } from "@/components/ui/button";
```

Note: the `type Button` import from `@clidey/ux` is used in `buttonProps?: ComponentProps<typeof Button>`. After the change, `Button` is imported from `@/components/ui/button` so `ComponentProps<typeof Button>` still works.

Also note: `buttonVariants` is defined in shadcn's `button.tsx`, not in `utils.ts`. Update the import:

```tsx
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Button } from "@/components/ui/button";
```

- [ ] **Step 3: Run type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -20
```

Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ux.tsx
git commit -m "refactor(imports): update ux.tsx SearchSelect to use shadcn"
```

---

## Task 28: Remove @clidey/ux Dependency and Verify

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Verify no remaining @clidey/ux imports**

```bash
grep -rn "@clidey/ux" frontend/src --include="*.tsx" --include="*.ts" 2>/dev/null
```

Expected: **Zero results.** If any files still import from `@clidey/ux`, fix them before continuing.

- [ ] **Step 2: Run full type check**

```bash
cd frontend && pnpm run typecheck 2>&1 | grep -E "error|Error" | head -30
```

Expected: Zero errors. Fix any type errors before proceeding.

- [ ] **Step 3: Remove @clidey/ux from package.json**

```bash
cd frontend && pnpm remove @clidey/ux
```

Expected: `@clidey/ux` removed from `package.json` and `bun.lock`.

- [ ] **Step 4: Run build to verify**

```bash
cd frontend && pnpm run build:ce 2>&1 | tail -20
```

Expected: Build completes successfully with no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/bun.lock
git commit -m "chore(deps): remove @clidey/ux dependency — fully migrated to shadcn"
```

---

## Summary

After completing all tasks:
- `@clidey/ux` is removed from `package.json`
- All 56 files import from `@/components/ui/*`, `@/components/theme/*`, `@/lib/utils`, or `sonner` directly
- `src/components/ui/` contains all shadcn components plus custom components:
  - `spinner.tsx`, `kbd.tsx`, `search-input.tsx`, `copy-button.tsx`, `mode-toggle.tsx`
  - `tree.tsx`, `data-pagination.tsx`, `stack-list.tsx`, `empty-state.tsx`
  - Augmented `table.tsx` with `TableHeadRow` and `VirtualizedTableBody`
- `src/components/theme/provider.tsx` wraps `next-themes`
- `src/lib/utils.ts` exports `cn` and `toTitleCase`
- `src/index.css` has shadcn CSS variables replacing `@clidey/ux/styles.css`
