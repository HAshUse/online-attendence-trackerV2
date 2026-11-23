import { forwardRef } from "react";
import { cn } from "../../lib/utils";

const Badge = forwardRef(
  ({ className, variant = "default", children, ...props }, ref) => {
    const variants = {
      default:
        "bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]/20",
      secondary:
        "bg-[var(--bg-secondary)] text-[var(--subtext)] border-[var(--border)]",
      success:
        "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
      warning:
        "bg-amber-500/10 text-amber-400 border-amber-500/25",
      danger:
        "bg-rose-500/10 text-rose-400 border-rose-500/25",
      outline:
        "bg-transparent text-[var(--text)] border-[var(--border)]",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors select-none",
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
export { Badge };
