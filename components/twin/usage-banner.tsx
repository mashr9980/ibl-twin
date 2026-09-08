"use client";

// The free plan, made visible: how many free videos are left this month, and
// the upgrade for more. Paying members and admins see nothing.

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/components/twin/alert";
import { HEYGEN_USAGE_EVENT } from "@/lib/heygen/credential";
import { fetchUsage, type AllowanceView } from "@/lib/paywall-client";

const DISMISS_KEY = "usage_banner_dismissed";

export function UsageBanner() {
  const [usage, setUsage] = useState<AllowanceView | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchUsage()
        .then((u) => !cancelled && setUsage(u))
        .catch(() => {});
    };
    load();
    window.addEventListener(HEYGEN_USAGE_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(HEYGEN_USAGE_EVENT, load);
    };
  }, []);

  if (!usage || usage.tier !== "free" || usage.limit === null) return null;
  const exhausted = (usage.remaining ?? 0) <= 0;
  if (!exhausted && dismissed) return null;

  const resets = new Date(usage.resets_at).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  const upgrade = (
    <Link href="/join" className="font-medium underline underline-offset-4">
      Upgrade for unlimited videos
    </Link>
  );

  return (
    <div className="px-4 pt-4 sm:px-6">
      <Alert
        onDismiss={
          exhausted
            ? undefined
            : () => {
                setDismissed(true);
                try {
                  sessionStorage.setItem(DISMISS_KEY, "1");
                } catch {
                  /* private mode */
                }
              }
        }
      >
        {exhausted ? (
          <>
            You&apos;ve used your {usage.limit} free video{usage.limit === 1 ? "" : "s"} for this month.{" "}
            {upgrade}, or your free videos return on {resets}.
          </>
        ) : (
          <>
            Free plan: {usage.used} of {usage.limit} free video{usage.limit === 1 ? "" : "s"} used this month.{" "}
            {upgrade}.
          </>
        )}
      </Alert>
    </div>
  );
}
