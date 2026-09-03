"use client";

import { useEffect, useState } from "react";

import config from "@/lib/iblai/config";
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

    try {
      const res = await fetch(
        `${config.dmUrl()}/api/ai-account/orgs/${encodeURIComponent(tenant)}` +
          `/integration-credential/?name=heygen`,
        { headers: { Authorization: `Token ${token}`, Accept: "application/json" } },
      );
      if (!res.ok) return "missing";
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.results ?? [];
      const present = list.some(
        (e: { name?: string; value?: { key?: string } }) =>
          e && (e.name === "heygen" || e.name === "heygen-private") &&
          typeof e.value?.key === "string" && e.value.key.length > 0,
      );
      return present ? "ok" : "missing";
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
