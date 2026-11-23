import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Input = forwardRef(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 py-2 text-xs sm:text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] transition-all duration-150 focus-visible:outline-none focus-visible:border-[var(--border-focus)] focus-visible:bg-[var(--card)] focus-visible:ring-2 focus-visible:ring-[var(--primary-ring)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});

Input.displayName = "Input";
export { Input };
