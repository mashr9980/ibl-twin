"use client";

import { useEffect, useState } from "react";

import { HEYGEN_CREDITS_EVENT, type HeygenCredits } from "@/lib/heygen/credential";
import { resolveAppTenant } from "@/lib/iblai/tenant";

export type HeygenCredentialState = "checking" | "ok" | "missing";

type Status = { state: HeygenCredentialState; credits: HeygenCredits | null };

/** One probe per session, shared by every component that asks; re-asked when a call ran out of credits. */
let cached: Promise<Status> | null = null;

function probe(): Promise<Status> {
  if (cached) return cached;
  cached = (async (): Promise<Status> => {
    if (typeof window === "undefined") return { state: "missing", credits: null };
    const token = localStorage.getItem("dm_token");
    const tenant = resolveAppTenant();
    if (!token || !tenant) return { state: "missing", credits: null };

    // Ask our own server, not the platform: the platform reports a masked
    // credential as present, which would unlock the UI for calls that then
    // fail upstream with an opaque 401.
    try {
      const res = await fetch("/api/heygen/status", {
        headers: { Authorization: `Token ${token}`, "X-Platform": tenant },
        cache: "no-store",
      });
      if (!res.ok) return { state: "missing", credits: null };
      const data = (await res.json()) as { ok?: boolean; credits?: HeygenCredits | null };
      return { state: data.ok ? "ok" : "missing", credits: data.credits ?? null };
    } catch {
      return { state: "missing", credits: null };
    }
  })();
  return cached;
}

function useHeygenStatus(): Status {
  const [status, setStatus] = useState<Status>({ state: "checking", credits: null });
  useEffect(() => {
    let cancelled = false;
    const ask = () => {
      void probe().then((s) => !cancelled && setStatus(s));
    };
    ask();
    // A call just failed for lack of credits: the balance is stale, ask again.
    const refresh = () => {
      cached = null;
      ask();
    };
    window.addEventListener(HEYGEN_CREDITS_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(HEYGEN_CREDITS_EVENT, refresh);
    };
  }, []);
  return status;
}

export function useHeygenCredential(): HeygenCredentialState {
  return useHeygenStatus().state;
}

/** The workspace's HeyGen balance as the server last saw it; null while unknown. */
export function useHeygenCredits(): HeygenCredits | null {
  return useHeygenStatus().credits;
}
