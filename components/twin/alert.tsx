"use client";

/** Twin's inline alert: brand blue for notices, amber for warnings, with an optional dismiss. */

import { cn } from "@/lib/utils";

const TONES = {
  info: "border-[#38A1E5]/50 bg-[#eef6fc] text-[#38A1E5] dark:border-[#5ec4ff]/40 dark:bg-[rgb(15_45_72_/_0.92)] dark:text-[#5ec4ff]",
  warning:
    "border-[#f2b544]/70 bg-[#fff7e6] text-[#8a5a00] dark:border-[#f2b544]/40 dark:bg-[rgb(66_46_10_/_0.92)] dark:text-[#ffd27a]",
};

export function Alert({
  children,
  onDismiss,
  className,
  tone = "info",
}: {
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center justify-between rounded-lg border px-4 py-3",
        TONES[tone],
        className,
      )}
    >
      <p className="text-sm">{children}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss error"
          className="ml-4 text-current/70 transition-colors hover:text-current"
        >
          ✕
        </button>
      )}
    </div>
  );
}
