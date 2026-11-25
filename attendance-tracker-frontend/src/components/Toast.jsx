import { useEffect, useState } from "react";

/**
 * Toast notification card with timer progress bar and auto-dismiss.
 *
 * @param {object} props
 * @param {string} props.message - Notification message
 * @param {string} [props.title] - Optional title/heading
 * @param {"success"|"warning"|"error"|"info"} [props.type="info"] - Notification category
 * @param {number} [props.duration=4000] - Duration in ms before auto-dismiss
 * @param {function} props.onClose - Callback to dismiss the toast
 */
export default function Toast({
  message,
  title,
  type = "info",
  duration = 4000,
  actionUrl,
  actionLabel = "Open Link ↗",
  onClose,
}) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!message) return;

    const startTime = Date.now();
    const interval = 25; // update every 25ms for smooth animation

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (elapsed >= duration) {
        clearInterval(timer);
        onClose?.();
      }
    }, interval);

    return () => clearInterval(timer);
  // shortcut: onClose intentionally excluded — it's a stable setter passed inline; including it restarts the timer on every parent render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, duration]);

  if (!message) return null;

  // Type styling definitions
  const config = {
    success: {
      icon: (
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      ),
      badgeBg: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
      barColor: "bg-gradient-to-r from-emerald-500 to-teal-400",
      borderColor: "border-emerald-500/30",
      defaultTitle: "Success",
    },
    warning: {
      icon: (
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
      ),
      badgeBg: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
      barColor: "bg-gradient-to-r from-amber-500 to-orange-400",
      borderColor: "border-amber-500/30",
      defaultTitle: "Notice",
    },
    error: {
      icon: (
        <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
      ),
      badgeBg: "bg-rose-500/20 text-rose-400 border border-rose-500/30",
      barColor: "bg-gradient-to-r from-rose-500 to-red-400",
      borderColor: "border-rose-500/30",
      defaultTitle: "Error",
    },
    info: {
      icon: (
        <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
      ),
      badgeBg: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
      barColor: "bg-gradient-to-r from-indigo-500 to-purple-400",
      borderColor: "border-indigo-500/30",
      defaultTitle: "Info",
    },
  };

  const current = config[type] || config.info;

  return (
    <div className="fixed top-5 right-5 z-[9999] max-w-sm sm:max-w-md w-[calc(100%-40px)] animate-[fadeIn_0.2s_ease-out]">
      <div
        className={`relative overflow-hidden bg-[var(--card)]/95 backdrop-blur-md rounded-2xl border ${current.borderColor} shadow-2xl shadow-black/40 p-4 transition-all duration-300`}
      >
        <div className="flex items-start gap-3.5">
          {current.icon}

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${current.badgeBg}`}>
                {title || current.defaultTitle}
              </span>
            </div>
            <p className="text-[13px] font-medium text-[var(--text)] leading-snug break-words m-0">
              {message}
            </p>

            {actionUrl && (
              <a
                href={actionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold no-underline hover:opacity-90 transition-opacity"
              >
                <span>{actionLabel}</span>
              </a>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[var(--subtext)] hover:text-[var(--text)] p-1 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer border-0 bg-transparent shrink-0"
            title="Dismiss"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Animated Timer Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--border)] overflow-hidden">
          <div
            className={`h-full ${current.barColor} transition-[width] duration-[25ms] ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
