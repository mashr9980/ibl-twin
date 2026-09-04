"use client";

/** Twin's inline alert: brand blue, not red, with an optional dismiss. */

import { cn } from "@/lib/utils";

export function Alert({
  children,
  onDismiss,
  className,
}: {
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center justify-between rounded-lg border border-[#38A1E5]/50 bg-[#eef6fc] px-4 py-3 text-[#38A1E5] dark:border-[#5ec4ff]/40 dark:bg-[rgb(15_45_72_/_0.92)] dark:text-[#5ec4ff]",
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
