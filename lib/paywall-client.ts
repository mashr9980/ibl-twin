// Browser-side helpers for the paywall routes. The user's DM token is the only
// credential the browser holds; the server maps it to an identity.

export type Access = "free" | "one_time" | "monthly";

export type CataloguePriceView = {
  id: string;
  productId: string;
  name: string;
  /** Minor units (cents). */
  unitAmount: number;
  currency: string;
  interval: "month" | "year" | null;
};

export type CatalogueView = {
  app: string;
  appName: string;
  serverReady: boolean;
  paywall: boolean;
  decided: boolean;
  source: "env" | "metadata" | "none";
  /** Membership is free; the plan is the upgrade for unlimited videos. */
  free: boolean;
  /** Free videos per month on the free plan. */
  freeVideos: number;
  platformName: string;
  prices: CataloguePriceView[];
  settings: { access: Access; amount: number | null } | null;
};

export type AdminPriceView = CataloguePriceView & {
  access: Access | null;
  sellable: boolean;
  created: number;
};

export type AccessView = {
  joined?: boolean;
  has_access?: boolean;
  payer?: boolean;
  paywall?: boolean;
  relinked?: boolean;
  reason?: string;
};

export class PaywallRequestError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PaywallRequestError";
  }
}

export const dmToken = () =>
  typeof window === "undefined" ? "" : (localStorage.getItem("dm_token") ?? "");

export async function paywallFetch<T = unknown>(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string>; json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const token = dmToken();
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...(token && { Authorization: `Token ${token}` }),
      ...(json !== undefined && { "Content-Type": "application/json" }),
      ...headers,
    },
    ...(json !== undefined && { body: JSON.stringify(json) }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok)
    throw new PaywallRequestError(
      res.status,
      data?.error ?? data?.detail ?? `Request failed (${res.status})`,
    );
  return data as T;
}

export const fetchCatalogue = () => paywallFetch<CatalogueView>("/api/paywall/prices");

export type AllowanceView = {
  tier: "admin" | "plus" | "free";
  used: number;
  limit: number | null;
  remaining: number | null;
  period: string;
  resets_at: string;
};

/** The signed-in user's tier and free-video allowance this month. */
export const fetchUsage = () => paywallFetch<AllowanceView>("/api/paywall/usage");

export const fetchAdminPrices = () =>
  paywallFetch<{ prices: AdminPriceView[] }>("/api/paywall/admin/prices").then((r) => r.prices ?? []);

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong; try again.";

export const errorWithStatus = (e: unknown) =>
  e instanceof PaywallRequestError ? `${e.message} (${e.status})` : errorMessage(e);

const SETUP_OK_KEY = "paywall_setup_ok_at";
const SETUP_TTL_MS = 600_000;

const session = () => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

export function setupSettled(): boolean {
  return Date.now() - Number(session()?.getItem(SETUP_OK_KEY) ?? 0) < SETUP_TTL_MS;
}
export const markSetupDone = () => session()?.setItem(SETUP_OK_KEY, String(Date.now()));

export async function checkPaywallSetup(): Promise<"decided" | "undecided" | "unknown"> {
  try {
    const { paywall } = await fetchCatalogue();
    if (!paywall) return "undecided";
    markSetupDone();
    return "decided";
  } catch (e) {
    console.error("[paywall] setup check failed:", e);
    return "unknown";
  }
}

const ACCESS_OK_KEY = "paywall_ok_at";
const ACCESS_TTL_MS = 60_000;

export function memberAccessSettled(): boolean {
  return Date.now() - Number(session()?.getItem(ACCESS_OK_KEY) ?? 0) < ACCESS_TTL_MS;
}

/** A hiccup reads as true: never lock a member out for it. */
export async function checkMemberAccess(): Promise<boolean> {
  try {
    const { has_access } = await paywallFetch<AccessView>("/api/paywall/access");
    if (has_access !== false) session()?.setItem(ACCESS_OK_KEY, String(Date.now()));
    return has_access !== false;
  } catch (e) {
    console.error("[paywall] access check failed:", e);
    return true;
  }
}

export const maskedKeyShort = (masked: string) =>
  masked.length > 5 ? `${masked.slice(0, 3)}…${masked.slice(-2)}` : masked;

export const isPublishableKey = (masked: string) => masked.startsWith("pk_");

export function formatAmount(unitAmount: number, currency: string): string {
  const major = unitAmount / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
    }).format(major);
  } catch {
    return `${major} ${currency.toUpperCase()}`;
  }
}
