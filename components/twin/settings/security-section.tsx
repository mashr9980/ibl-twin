"use client";

// Security, laid out as twin.memorare.ai's: single sign-on and two-factor
// sign-in are plan features, so this is the upgrade screen.

import Link from "next/link";
import { Sparkles, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { PRIMARY_BTN_LG } from "./ui";

export function SecuritySection({ onClose }: { onClose: () => void }) {
  return (
    <div className="w-full">
      <div className="flex min-h-[min(420px,60vh)] flex-col items-center justify-center px-4 py-10 text-center">
        <div className="relative mb-6 flex size-28 items-center justify-center">
          <div className="flex size-24 items-center justify-center rounded-[8px] bg-sky-100 text-4xl font-bold tracking-tight text-sky-500 dark:bg-sky-950/50 dark:text-sky-400" aria-hidden="true">
            SSO
          </div>
          <UserRound className="absolute -bottom-1 -right-1 size-10 text-sky-400/80" strokeWidth={1.25} aria-hidden />
        </div>
        <h3 className="max-w-md text-lg font-semibold text-[var(--foreground)]">Enable SSO and two-factor authentication</h3>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-[var(--muted-foreground)]">
          Access Memorare Twin securely with Single Sign-On (SSO), available on Business plan and above, and two-factor
          authentication (2FA), available on Enterprise plan. These can be enabled by your Workspace admin.
        </p>
        <Link href="/join" onClick={onClose} className={cn(PRIMARY_BTN_LG, "mt-8 gap-2")}>
          <Sparkles className="size-4 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
          Upgrade plan
        </Link>
      </div>
    </div>
  );
}
