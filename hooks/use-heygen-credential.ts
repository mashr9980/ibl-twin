"use client";

import { useEffect, useState } from "react";

import { resolveAppTenant } from "@/lib/iblai/tenant";

export type HeygenCredentialState = "checking" | "ok" | "missing";

/** One probe per session, shared by every component that asks. */
let cached: Promise<HeygenCredentialState> | null = null;

function probe(): Promise<HeygenCredentialState> {
  if (cached) return cached;
  cached = (async (): Promise<HeygenCredentialState> => {
    if (typeof window === "undefined") return "missing";
    const token = localStorage.getItem("dm_token");
    const tenant = resolveAppTenant();
    if (!token || !tenant) return "missing";

    // Ask our own server, not the platform: the platform reports a masked
    // credential as present, which would unlock the UI for calls that then
    // fail upstream with an opaque 401.
    try {
      const res = await fetch("/api/heygen/status", {
        headers: { Authorization: `Token ${token}`, "X-Platform": tenant },
        cache: "no-store",
      });
      if (!res.ok) return "missing";
      const data = (await res.json()) as { ok?: boolean };
      return data.ok ? "ok" : "missing";
    } catch {
      return "missing";
    }
  })();
  return cached;
}

export function useHeygenCredential(): HeygenCredentialState {
  const [state, setState] = useState<HeygenCredentialState>("checking");
  useEffect(() => {
    let cancelled = false;
    probe().then((s) => !cancelled && setState(s));
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
