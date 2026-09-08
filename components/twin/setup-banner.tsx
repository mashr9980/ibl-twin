"use client";

// Nudges an admin who has not published a plan yet; once per session.

import Link from "next/link";
import { useEffect, useState } from "react";

import { Alert } from "@/components/twin/alert";
import { checkPaywallSetup, markSetupDone, setupSettled } from "@/lib/paywall-client";

export function SetupBanner({ isAdmin }: { isAdmin: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isAdmin || setupSettled()) return;
    let cancelled = false;
    void checkPaywallSetup().then((state) => {
      if (!cancelled && state === "undecided") setShow(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (!show) return null;
  return (
    <div className="px-4 pt-4 sm:px-6">
      <Alert
        onDismiss={() => {
          markSetupDone();
          setShow(false);
        }}
      >
        No plan is published yet, so new visitors cannot join. Set a fee on your Stripe account.{" "}
        <Link href="/account#payments" className="font-medium underline underline-offset-4">
          Publish a plan
        </Link>
      </Alert>
    </div>
  );
}
