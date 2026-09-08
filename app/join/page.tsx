"use client";

// An empty screen with a loader between the app, the Auth SPA and Stripe.
// Signed out → Auth SPA. Signed in → Stripe for the plan (the upgrade for a
// free-plan member), or straight into the app when they already pay or are
// an admin. Back from Stripe (?session_id) → confirm and open the app.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { hasLiveDmToken, readReturnPath, redirectToAuthSpa } from "@/lib/iblai/auth-utils";
import { NOTICE_PARAM, isMembershipNotice, isNoticeCode } from "@/lib/iblai/access";
import { AuthNotice } from "@/components/twin/auth-notice";
import { AutoCheckout, Loader } from "@/components/twin/auto-checkout";
import { CheckoutReturn } from "@/components/twin/checkout-return";

type Step = "handoff" | "join" | "return" | "notice";

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
      {children}
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <Screen>
          <Loader caption="Loading…" />
        </Screen>
      }
    >
      <AccessScreen />
    </Suspense>
  );
}

function AccessScreen() {
  const params = useSearchParams();
  const rawNotice = params?.get(NOTICE_PARAM);
  const notice = isNoticeCode(rawNotice) && !isMembershipNotice(rawNotice) ? rawNotice : null;
  const sessionId = params?.get("session_id") ?? "";
  const canceled = params?.get("canceled") === "1";

  const [signedIn] = useState(() => typeof window !== "undefined" && hasLiveDmToken());

  const step: Step = sessionId ? "return" : notice ? "notice" : signedIn ? "join" : "handoff";

  const signIn = () => void redirectToAuthSpa(readReturnPath(), undefined, false, true);

  useEffect(() => {
    if (step === "handoff") signIn();
  }, [step]);

  return (
    <Screen>
      {step === "return" ? (
        <CheckoutReturn sessionId={sessionId} onSignIn={signIn} />
      ) : step === "join" ? (
        <AutoCheckout canceled={canceled} />
      ) : step === "notice" && notice ? (
        <AuthNotice code={notice} onSignIn={signIn} />
      ) : (
        <Loader caption="Taking you to sign in…" />
      )}
    </Screen>
  );
}
