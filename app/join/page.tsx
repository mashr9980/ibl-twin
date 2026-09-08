"use client";

// An empty screen with a loader between the app, the Auth SPA and Stripe.
// Signed out → Auth SPA. Signed in, not a member → Stripe (or the app when
// already paid). Back from Stripe (?session_id) → confirm and open the app.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { hasLiveDmToken, readReturnPath, redirectToAuthSpa } from "@/lib/iblai/auth-utils";
import { NOTICE_PARAM, isMembershipNotice, isNoticeCode } from "@/lib/iblai/access";
import { isTenantMember, readTenants, resolveAppTenant } from "@/lib/iblai/tenant";
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
  const router = useRouter();
  const rawNotice = params?.get(NOTICE_PARAM);
  const notice = isNoticeCode(rawNotice) && !isMembershipNotice(rawNotice) ? rawNotice : null;
  const sessionId = params?.get("session_id") ?? "";
  const canceled = params?.get("canceled") === "1";

  const [visitor] = useState(() => {
    if (typeof window === "undefined") return { signedIn: false, member: false };
    return {
      signedIn: hasLiveDmToken(),
      member: isTenantMember(readTenants(), resolveAppTenant()),
    };
  });

  const step: Step = sessionId
    ? "return"
    : notice
      ? "notice"
      : visitor.signedIn
        ? "join"
        : "handoff";

  const signIn = () => void redirectToAuthSpa(readReturnPath(), undefined, false, true);

  useEffect(() => {
    if (step === "return") return;
    if (visitor.signedIn && visitor.member) {
      router.replace(readReturnPath());
      return;
    }
    if (step === "handoff") signIn();
  }, [step, visitor, router]);

  return (
    <Screen>
      {step === "return" ? (
        <CheckoutReturn sessionId={sessionId} onSignIn={signIn} />
      ) : step === "join" ? (
        visitor.member ? (
          <Loader caption="Opening the app…" />
        ) : (
          <AutoCheckout canceled={canceled} />
        )
      ) : step === "notice" && notice ? (
        <AuthNotice code={notice} onSignIn={signIn} />
      ) : (
        <Loader caption="Taking you to sign in…" />
      )}
    </Screen>
  );
}
