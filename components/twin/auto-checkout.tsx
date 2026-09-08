"use client";

// The invisible paywall: a signed-in non-member sees a loader and goes straight
// to Stripe Checkout, or straight into the app when they already paid.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { handleLogout, saveReturnPath } from "@/lib/iblai/auth-utils";
import { isTenantAdmin } from "@/lib/iblai/tenant";
import { PaywallRequestError, errorWithStatus, paywallFetch } from "@/lib/paywall-client";

type State =
  | { kind: "working"; caption: string }
  | { kind: "canceled" }
  | { kind: "closed" }
  | { kind: "failed"; message: string };

type CheckoutAnswer = { checkout_url?: string; already?: boolean };

export function Loader({ caption }: { caption: string }) {
  return (
    <div className="auth-card">
      <div className="auth-card__stack" style={{ textAlign: "center" }}>
        <div className="join-spinner" aria-hidden="true" />
        <p className="join-muted" aria-live="polite">
          {caption}
        </p>
      </div>
    </div>
  );
}

export function AutoCheckout({ canceled }: { canceled: boolean }) {
  const [state, setState] = useState<State>(
    canceled ? { kind: "canceled" } : { kind: "working", caption: "Taking you to secure payment…" },
  );
  const [attempt, setAttempt] = useState(0);
  const [admin] = useState(() => typeof window !== "undefined" && isTenantAdmin());
  // One request per attempt, however many times the effect runs.
  const inflight = useRef<{ attempt: number; promise: Promise<CheckoutAnswer> } | null>(null);

  useEffect(() => {
    if (state.kind !== "working") return;
    let cancelled = false;
    if (!inflight.current || inflight.current.attempt !== attempt) {
      inflight.current = {
        attempt,
        promise: paywallFetch<CheckoutAnswer>("/api/paywall/checkout", { method: "POST", json: {} }),
      };
    }
    void (async () => {
      try {
        const answer = await inflight.current!.promise;
        if (cancelled) return;
        if (answer.already) {
          setState({ kind: "working", caption: "Your payment is confirmed. Opening the app…" });
          saveReturnPath("/");
          window.location.assign("/");
          return;
        }
        if (!answer.checkout_url) throw new Error("The platform returned no checkout URL");
        window.location.assign(answer.checkout_url);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof PaywallRequestError && e.status === 404) setState({ kind: "closed" });
        else setState({ kind: "failed", message: errorWithStatus(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const retry = () => {
    setState({ kind: "working", caption: "Taking you to secure payment…" });
    setAttempt((a) => a + 1);
  };

  const signOut = (
    <p className="auth-card__signup">
      Not you?{" "}
      <button type="button" className="link-button" onClick={handleLogout}>
        Sign out
      </button>
    </p>
  );

  if (state.kind === "working") return <Loader caption={state.caption} />;

  if (state.kind === "closed") {
    return (
      <div className="auth-card">
        <div className="auth-card__stack" style={{ textAlign: "center" }}>
          <p className="join-muted">Joining isn&apos;t open yet. Check back soon.</p>
          {admin && (
            <Link className="btn btn--primary" href="/account#payments">
              Publish a plan
            </Link>
          )}
          {signOut}
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card__stack" style={{ textAlign: "center" }}>
        {state.kind === "canceled" ? (
          <p className="join-muted">Payment was cancelled. Subscribe to join.</p>
        ) : (
          <p className="field-error" role="alert">
            {state.message}
          </p>
        )}
        <button type="button" className="btn btn--primary" onClick={retry}>
          {state.kind === "canceled" ? "Continue to payment" : "Try again"}
        </button>
        {signOut}
      </div>
    </div>
  );
}
