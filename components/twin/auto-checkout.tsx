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

export const PRIMARY_BUTTON =
  "inline-flex h-10 items-center justify-center rounded-[8px] bg-[#2563EB] px-5 text-sm font-medium text-white transition-colors hover:bg-[#1d4fd8] disabled:pointer-events-none disabled:opacity-50";
export const LINK_BUTTON = "text-sm text-[#2563EB] underline-offset-4 hover:underline";
export const CAPTION = "text-sm text-[var(--content-caption)]";

/** A spinner and one line of text on an empty screen. */
export function Loader({ caption }: { caption: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <span
        className="size-8 animate-spin rounded-full border-[3px] border-[#2563EB]/20 border-t-[#2563EB]"
        aria-hidden="true"
      />
      <p className={CAPTION} aria-live="polite">
        {caption}
      </p>
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
    <button type="button" className={LINK_BUTTON} onClick={handleLogout}>
      Not you? Sign out
    </button>
  );

  if (state.kind === "working") return <Loader caption={state.caption} />;

  if (state.kind === "closed") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className={CAPTION}>No upgrade is available yet. Check back soon.</p>
        {admin && (
          <Link className={PRIMARY_BUTTON} href="/account#payments">
            Publish a plan
          </Link>
        )}
        {signOut}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {state.kind === "canceled" ? (
        <p className={CAPTION}>Payment was cancelled.</p>
      ) : (
        <p className="text-sm text-[#b5551a]" role="alert">
          {state.message}
        </p>
      )}
      <button type="button" className={PRIMARY_BUTTON} onClick={retry}>
        {state.kind === "canceled" ? "Continue to payment" : "Try again"}
      </button>
      {signOut}
    </div>
  );
}
