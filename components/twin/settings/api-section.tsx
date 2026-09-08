"use client";

// API, laid out as twin.memorare.ai's: the workspace's access code, which is
// what an integration sends alongside its own token when it calls the
// platform for this workspace.

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { OUTLINE_BTN } from "./ui";

export function ApiSection({ tenantKey }: { tenantKey: string }) {
  const [copied, setCopied] = useState(false);
  const code = tenantKey || "—";

  return (
    <div className="w-full">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-[var(--sidebar-foreground)] dark:text-[var(--foreground)]">Access code</h3>
        <p className="text-sm leading-relaxed text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)]">
          Given to you by an administrator. Keep it private.
        </p>
      </div>
      <div className="mt-5 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-stretch">
        <div
          className="flex min-h-11 min-w-0 flex-1 items-center rounded-lg border border-[var(--input)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] px-4 py-2.5 font-mono text-sm text-[var(--muted-foreground)] dark:bg-[color-mix(in_oklab,var(--muted)_25%,transparent)] sm:min-h-10 sm:py-0"
          aria-label="Access code"
        >
          <span className="min-w-0 truncate">{code}</span>
        </div>
        <button
          type="button"
          aria-label="Copy access code"
          disabled={!tenantKey}
          onClick={() => {
            void navigator.clipboard.writeText(code).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className={cn(OUTLINE_BTN, "size-11 shrink-0 self-end rounded-[5px] px-0 sm:size-10 sm:self-auto")}
        >
          {copied ? <Check className="size-4" strokeWidth={1.75} /> : <Copy className="size-4" strokeWidth={1.75} />}
        </button>
      </div>
    </div>
  );
}
