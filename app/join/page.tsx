"use client";

// The access screen: a loader between the app, the Auth SPA and Stripe.
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

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
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

  const body =
    step === "return" ? (
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
    );

  return (
    <div className="min-h-screen">
      <div
        className="login-page w-full"
        style={
          {
            "--section-gap": "3.1rem",
            "--logo-h": "4rem",
            "--control-h": "3.25rem",
            "--control-font": "1.0625rem",
            "--card-pad": "1.625rem",
            "--stack-gap": "1.375rem",
            "--brand-font": "2.625rem",
          } as React.CSSProperties
        }
      >
        <main className="login-column">
          <div className="login-column__inner">
            <div
              className="logo-section logo-section--custom"
              style={
                {
                  "--logo-img-h-custom": "43.333333333333336px",
                  "--logo-img-margin-top-custom": "0px",
                  "--logo-img-margin-bottom-custom": "1.3333333333333333px",
                } as React.CSSProperties
              }
            >
              <div className="logo-section__row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="logo-section__img" alt="memorare twin" src="/images/memorare-twin-logo.png" />
                <div className="logo-section__text">
                  <span className="logo-section__line logo-section__line--top">memorare</span>
                  <span className="logo-section__line-wrap logo-section__line-wrap--bottom">
                    <span className="logo-section__line logo-section__line--bottom">twin</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="auth-main">
              {body}
              <div className="auth-card__legal">
                <a target="_blank" rel="noopener noreferrer" href="/terms">Terms of Use</a>
                <span className="sep">|</span>
                <a target="_blank" rel="noopener noreferrer" href="/privacy">Privacy Policy</a>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
