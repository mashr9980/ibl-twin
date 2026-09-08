"use client";

// Back from Stripe: a loader while the server confirms the payment and links
// the member, then a full load into the app.

import { useEffect, useState } from "react";

import { hasLiveDmToken, saveReturnPath } from "@/lib/iblai/auth-utils";
import { PaywallRequestError, errorMessage, paywallFetch, type AccessView } from "@/lib/paywall-client";
import { Loader } from "@/components/twin/auto-checkout";

const POLL_MS = 3_000;
const DEADLINE_MS = 60_000;

type State = { kind: "checking" } | { kind: "signin" } | { kind: "failed"; message: string };

export function CheckoutReturn({ sessionId, onSignIn }: { sessionId: string; onSignIn: () => void }) {
  const [state, setState] = useState<State>({ kind: "checking" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    if (!hasLiveDmToken()) {
      setState({ kind: "signin" });
      return;
    }
    let cancelled = false;
    const deadline = Date.now() + DEADLINE_MS;
    let lastError = "We couldn't confirm your payment yet.";
    const qs = new URLSearchParams({ session_id: sessionId });

    const tick = async () => {
      try {
        const { joined } = await paywallFetch<AccessView>(`/api/paywall/access?${qs}`);
        if (joined) {
          saveReturnPath("/");
          window.location.assign("/");
          return;
        }
      } catch (e) {
        if (e instanceof PaywallRequestError && e.status === 401) {
          if (!cancelled) setState({ kind: "signin" });
          return;
        }
        lastError = errorMessage(e);
      }
      if (cancelled) return;
      if (Date.now() < deadline) setTimeout(() => void tick(), POLL_MS);
      else setState({ kind: "failed", message: lastError });
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [sessionId, attempt]);

  const shown: State = sessionId ? state : { kind: "failed", message: "No checkout session in the URL." };

  if (shown.kind === "checking") return <Loader caption="Confirming your payment…" />;

  return (
    <div className="auth-card">
      <div className="auth-card__stack" style={{ textAlign: "center" }}>
        {shown.kind === "signin" ? (
          <>
            <p className="join-muted">Sign in with the account you paid with to finish joining.</p>
            <button type="button" className="btn btn--primary" onClick={onSignIn}>
              Sign in
            </button>
          </>
        ) : (
          <>
            <p className="field-error" role="alert">
              {shown.message}
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setState({ kind: "checking" });
                setAttempt((a) => a + 1);
              }}
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
