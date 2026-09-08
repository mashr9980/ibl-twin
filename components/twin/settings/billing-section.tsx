"use client";

// Plan & Billing, laid out as twin.memorare.ai's: one card naming the plan
// this member is on, what it includes, and the way to upgrade.

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchUsage, type AllowanceView } from "@/lib/paywall-client";
import { PRIMARY_BTN_PILL } from "./ui";

const PLAN_NAME: Record<AllowanceView["tier"], string> = {
  free: "Free",
  plus: "Plus",
  admin: "Workspace admin",
};

export function BillingSection({ onClose }: { onClose: () => void }) {
  const [usage, setUsage] = useState<AllowanceView | null>(null);

  useEffect(() => {
    fetchUsage().then(setUsage).catch(() => setUsage(null));
  }, []);

  const resets = usage ? new Date(usage.resets_at).toLocaleDateString(undefined, { day: "numeric", month: "long" }) : "";
  const includes = !usage
    ? "Loading your plan…"
    : usage.tier === "free" && usage.limit !== null
      ? `${usage.limit} video${usage.limit === 1 ? "" : "s"} / month · resets on ${resets}`
      : usage.tier === "admin"
        ? "Unlimited videos · billed to this workspace's HeyGen credits"
        : "Unlimited videos · billed monthly";

  const detail = !usage
    ? "Your plan and this month's usage will appear here."
    : usage.tier === "free" && usage.limit !== null
      ? `You have used ${usage.used} of your ${usage.limit} free videos this month. Upgrading lifts the limit; your twin and your videos stay as they are.`
      : usage.tier === "plus"
        ? "Thanks for subscribing. Payments are handled by Stripe on this workspace's own account."
        : "Admins generate without a monthly limit. Videos are billed to the workspace's HeyGen credits.";

  return (
    <div className="w-full">
      <div className="rounded-[9px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)]">
          Current plan
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-2xl font-semibold tracking-tight text-[var(--sidebar-foreground)] dark:text-[var(--foreground)]">
              {usage ? PLAN_NAME[usage.tier] : "—"}
            </p>
            <p className="text-sm text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)]">{includes}</p>
          </div>
          <Link href="/join" onClick={onClose} className={PRIMARY_BTN_PILL}>
            Upgrade
          </Link>
        </div>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)]">{detail}</p>
    </div>
  );
}
