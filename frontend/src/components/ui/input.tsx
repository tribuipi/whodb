import * as React from "react"

import { cn } from "@/lib/utils"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"

interface InputProps extends React.ComponentProps<"input"> {
  showPasswordToggle?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, showPasswordToggle, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    if (showPasswordToggle && type === "password") {
      return (
        <div className="relative flex items-center">
          <input
            type={showPassword ? "text" : "password"}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
              className
            )}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            className="absolute right-2 text-muted-foreground hover:text-foreground"
            onClick={() =>{  setShowPassword((v) => !v); }}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      );
    }

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
