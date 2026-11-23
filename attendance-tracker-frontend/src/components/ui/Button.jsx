import { forwardRef } from "react";
import { cn } from "../lib/utils";

const Button = forwardRef(
  (
    {
      className,
      variant = "default",
      size = "default",
      disabled = false,
      loading = false,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 select-none cursor-pointer focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed active:scale-[0.98]";

    const variants = {
      default:
        "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm hover:shadow-indigo-500/20",
      secondary:
        "bg-[var(--bg-secondary)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--card-hover)] hover:border-[var(--border-focus)] shadow-xs",
      outline:
        "bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-focus)]",
      ghost:
        "bg-transparent text-[var(--subtext)] hover:text-[var(--text)] hover:bg-[var(--bg-secondary)]",
      danger:
        "bg-[var(--danger)] text-white hover:bg-[var(--danger-hover)] shadow-sm hover:shadow-red-500/20",
      success:
        "bg-[var(--success)] text-white hover:bg-[var(--success-hover)] shadow-sm hover:shadow-emerald-500/20",
      gradient:
        "bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white hover:opacity-95 shadow-md shadow-indigo-600/25",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      default: "h-9.5 px-4 text-xs sm:text-sm gap-2",
      lg: "h-11 px-6 text-sm sm:text-base gap-2.5",
      icon: "h-9 w-9 p-0",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-3.5 w-3.5 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
