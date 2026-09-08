"use client";

// Plan & Billing, laid out as twin.memorare.ai's: one card with the plan the
// member is on and the way to upgrade. Admins also get this workspace's own
// plan settings, which is where the price members pay is published.

import Link from "next/link";
import { useEffect, useState } from "react";

import { PaymentsSettings } from "@/components/twin/payments-settings";
import { fetchUsage, type AllowanceView } from "@/lib/paywall-client";
import { PRIMARY_BTN_PILL } from "./ui";

const PLAN_NAME: Record<AllowanceView["tier"], string> = {
  free: "Free",
  plus: "Plus",
  admin: "Workspace admin",
};

export function BillingSection({ tenantKey, isAdmin, onClose }: { tenantKey: string; isAdmin: boolean; onClose: () => void }) {
  const [usage, setUsage] = useState<AllowanceView | null>(null);

  useEffect(() => {
    fetchUsage().then(setUsage).catch(() => setUsage(null));
  }, []);

  const resets = usage
    ? new Date(usage.resets_at).toLocaleDateString(undefined, { day: "numeric", month: "long" })
    : "";
  const allowance =
    !usage
      ? "Loading your plan…"
      : usage.tier === "free" && usage.limit !== null
        ? `${usage.limit} video${usage.limit === 1 ? "" : "s"} / month · resets on ${resets}`
        : usage.tier === "admin"
          ? "Unlimited videos · this workspace's own HeyGen credits"
          : "Unlimited videos · billed monthly";

  return (
    <div className="w-full">
      <div className="rounded-[9px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)]">Current plan</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-2xl font-semibold tracking-tight text-[var(--sidebar-foreground)] dark:text-[var(--foreground)]">
              {usage ? PLAN_NAME[usage.tier] : "—"}
            </p>
            <p className="text-sm text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)]">{allowance}</p>
          </div>
          {usage?.tier === "free" && (
            <Link href="/join" onClick={onClose} className={PRIMARY_BTN_PILL}>
              Upgrade
            </Link>
          )}
        </div>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)]">
        {usage?.tier === "free"
          ? `You have used ${usage.used} of your ${usage.limit} free videos this month. Upgrading lifts the limit; your videos and twin stay as they are.`
          : usage?.tier === "plus"
            ? "Thanks for subscribing. Your payment is handled by Stripe on this workspace's own account."
            : "Admins of this workspace generate without a limit; videos are billed to the workspace's HeyGen credits."}
      </p>

      {isAdmin && (
        <div className="mt-8 border-t border-[var(--border)] pt-8">
          <PaymentsSettings tenantKey={tenantKey} />
        </div>
      )}
    </div>
  );
}
