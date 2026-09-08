"use client";

// Appears only once a free-plan member has used this month's free videos:
// says so and offers the upgrade. Nothing is shown while videos remain.

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/components/twin/alert";
import { HEYGEN_USAGE_EVENT } from "@/lib/heygen/credential";
import { fetchUsage, type AllowanceView } from "@/lib/paywall-client";

export function UsageBanner() {
  const [usage, setUsage] = useState<AllowanceView | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      void fetchUsage()
        .then((u) => !cancelled && setUsage(u))
        .catch(() => {});
    };
    load();
    // A generation was just counted or refused: re-ask, so the banner shows
    // the moment the last free video is used.
    window.addEventListener(HEYGEN_USAGE_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(HEYGEN_USAGE_EVENT, load);
    };
  }, []);

  if (!usage || usage.tier !== "free" || usage.limit === null) return null;
  if ((usage.remaining ?? 0) > 0) return null;

  const resets = new Date(usage.resets_at).toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return (
    <div className="px-4 pt-4 sm:px-6">
      <Alert tone="warning">
        You&apos;ve used your {usage.limit} free video{usage.limit === 1 ? "" : "s"} for this month.{" "}
        <Link href="/join" className="font-medium underline underline-offset-4">
          Upgrade for unlimited videos
        </Link>
        , or your free videos return on {resets}.
      </Alert>
    </div>
  );
}
