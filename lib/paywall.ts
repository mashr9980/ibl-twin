// Server-only. Acts as the platform through config.platformAuth().
import config from "./iblai/config";

export const paywallSlug = () => process.env.PAYWALL_APP_SLUG?.trim() || "ibl-twin";

export function appBaseUrl(req: { url: string }): string {
  const env = (process.env.IBLAI_APP_BASE_URL ?? "").replace(/\/+$/, "");
  if (env && !/^https?:\/\/\S+$/.test(env))
    throw new Error(`IBLAI_APP_BASE_URL must be an absolute http(s) origin, got "${env}"`);
  return env || new URL(req.url).origin;
}

export function platformCredentialProblem(): string {
  return config.platformAuth()
    ? ""
    : "No platform credential: set IBLAI_API_KEY (a Platform API Token) or IBLAI_ADMIN_TOKEN (an admin's dm_token) in .env.local.";
}

export type PaywallUser = { userId: number; username: string; email: string };

export type CataloguePrice = {
  id: string;
  productId: string;
  name: string;
  /** Minor units (cents). */
  unitAmount: number;
  currency: string;
  interval: "month" | "year" | null;
};

const identityCache = new Map<string, { user: PaywallUser | null; at: number }>();
const IDENTITY_TTL_MS = 60_000;

const verifyUrl = () => `${config.dmUrl()}/api/core/token/verify/`;

/** The token's own user, from the DM; membership is not required here. */
export async function resolveUser(dmToken: string): Promise<PaywallUser | null> {
  const hit = identityCache.get(dmToken);
  if (hit && Date.now() - hit.at < IDENTITY_TTL_MS) return hit.user;

  const res = await fetch(verifyUrl(), {
    headers: { Authorization: `Token ${dmToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const body = await res.json().catch(() => null);
  const user = body?.username
    ? { userId: Number(body.user_id ?? 0), username: body.username, email: body.email ?? "" }
    : null;
  identityCache.set(dmToken, { user, at: Date.now() });
  return user;
}

export function tokenFromRequest(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  return auth.startsWith("Token ") ? auth.slice(6).trim() : "";
}

export async function userFromRequest(req: Request): Promise<PaywallUser | null> {
  const token = tokenFromRequest(req);
  return token ? resolveUser(token) : null;
}

export async function callerFromRequest(
  req: Request,
): Promise<{ token: string; user: PaywallUser } | null> {
  const token = tokenFromRequest(req);
  const user = token ? await resolveUser(token) : null;
  return user ? { token, user } : null;
}

export type DmInit = Omit<RequestInit, "headers"> & { headers?: Record<string, string> };

const platformHeader = () => config.platformAuth();

const proxyBase = (username: string) =>
  `${config.dmUrl()}/api/ai-mentor/orgs/${config.mainTenantKey()}` +
  `/users/${encodeURIComponent(username)}/providers/stripe/payments`;

function dmFetch(authorization: string, username: string, path: string, init?: DmInit) {
  return fetch(`${proxyBase(username)}${path}`, {
    ...init,
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

/** A DM paywall call as {username}, with the platform credential. */
export function dmPaywallFetch(username: string, path: string, init?: DmInit) {
  return dmFetch(platformHeader(), username, path, init);
}

/** The DM Stripe proxy with the caller's own token: the DM enforces admin-only. */
export function dmStripeFetchAs(token: string, username: string, path: string, init?: DmInit) {
  return dmFetch(`Token ${token}`, username, path, init);
}

export class PaywallUpstreamError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`DM responded ${status}`);
    this.name = "PaywallUpstreamError";
  }
}

export async function dmJson(res: Response): Promise<any> {
  const body = await res.json().catch(() => null);
  if (!res.ok)
    throw new PaywallUpstreamError(res.status, body ?? { error: `DM responded ${res.status}` });
  return body;
}

let keyOwner: { username: string; at: number } | null = null;

/** The platform credential's own user: the path user for calls made as the platform. */
export async function keyOwnerUsername(): Promise<string> {
  if (keyOwner && Date.now() - keyOwner.at < IDENTITY_TTL_MS) return keyOwner.username;
  const body = await dmJson(
    await fetch(verifyUrl(), { headers: { Authorization: platformHeader() }, cache: "no-store" }),
  );
  const username = String(body?.username ?? "");
  if (!username)
    throw new PaywallUpstreamError(502, {
      error: "token/verify named no user for the platform credential",
    });
  keyOwner = { username, at: Date.now() };
  return username;
}

export async function dmPlatformFetch(path: string, init?: DmInit) {
  return dmPaywallFetch(await keyOwnerUsername(), path, init);
}

export function toCataloguePrice(price: any, product?: any): CataloguePrice {
  const expanded = typeof price?.product === "object" && price.product ? price.product : undefined;
  const prod = product ?? expanded;
  const interval = price?.recurring?.interval;
  return {
    id: String(price?.id ?? ""),
    productId: String(prod?.id ?? (typeof price?.product === "string" ? price.product : "")),
    name: String(price?.nickname || prod?.name || ""),
    unitAmount: Number(price?.unit_amount ?? 0),
    currency: String(price?.currency ?? ""),
    interval: interval === "month" || interval === "year" ? interval : null,
  };
}

/** PAYWALL_PRICE_IDS wins over the published plan. */
export function envPriceIds(): string[] {
  return (process.env.PAYWALL_PRICE_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// The published plan lives in the tenant's public metadata under apps.<slug>.
// Public read, admin-only deep-merging write: ids and amounts only.

export type Access = "free" | "one_time" | "monthly";

export type AppPaymentInfo = {
  version: 1;
  access: Access;
  /** Minor units (cents). Always USD. */
  amount: number | null;
  currency: "usd" | null;
  name?: string | null;
  stripe: {
    product_id: string | null;
    price_id: string | null;
    /** true when this app created the price; false when the owner made it in Stripe. */
    managed?: boolean;
  };
  updated_at: string;
  updated_by: string;
};

export const ACCESS_VALUES: readonly Access[] = ["free", "one_time", "monthly"];

export const planName = (access: Access) =>
  access === "monthly" ? "Monthly access" : "One-time access";

/** One-off → one_time; billed every single month → monthly; anything else is not sold here. */
export function accessForPrice(price: any): Access | null {
  const recurring = price?.recurring;
  if (!recurring) return "one_time";
  if (
    recurring.interval === "month" &&
    Number(recurring.interval_count ?? 1) === 1 &&
    (recurring.usage_type ?? "licensed") === "licensed"
  )
    return "monthly";
  return null;
}

const metadataUrl = () => `${config.dmUrl()}/api/core/orgs/${config.mainTenantKey()}/metadata/`;

type InfoRead = { info: AppPaymentInfo | null; platformName: string };

let infoCache: (InfoRead & { at: number }) | null = null;
const INFO_TTL_MS = 60_000;

export function invalidateAppPaymentInfo(): void {
  infoCache = null;
}

const isPaymentInfo = (x: unknown): x is AppPaymentInfo =>
  !!x &&
  typeof x === "object" &&
  ACCESS_VALUES.includes((x as { access?: Access }).access as Access) &&
  typeof (x as { stripe?: unknown }).stripe === "object";

export async function readAppPaymentInfo(): Promise<InfoRead> {
  if (infoCache && Date.now() - infoCache.at < INFO_TTL_MS) return infoCache;
  const body = await dmJson(await fetch(metadataUrl(), { cache: "no-store" }));
  const raw = body?.metadata?.apps?.[paywallSlug()];
  infoCache = {
    at: Date.now(),
    info: isPaymentInfo(raw) ? raw : null,
    platformName: String(body?.platform_name ?? ""),
  };
  return infoCache;
}

export async function writeAppPaymentInfo(token: string, info: AppPaymentInfo): Promise<void> {
  await dmJson(
    await fetch(metadataUrl(), {
      method: "PUT",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: { apps: { [paywallSlug()]: info } } }),
      cache: "no-store",
    }),
  );
  invalidateAppPaymentInfo();
}

export async function allowedPriceIds(): Promise<string[]> {
  const env = envPriceIds();
  if (env.length) return env;
  const { info } = await readAppPaymentInfo();
  return info && info.access !== "free" && info.stripe.price_id ? [info.stripe.price_id] : [];
}

const displayCache = new Map<string, { price: CataloguePrice; at: number }>();
const DISPLAY_TTL_MS = 60_000;

async function fetchPriceDisplay(id: string): Promise<CataloguePrice> {
  const hit = displayCache.get(id);
  if (hit && Date.now() - hit.at < DISPLAY_TTL_MS) return hit.price;
  const price = toCataloguePrice(
    await dmJson(await dmPlatformFetch(`/prices/${encodeURIComponent(id)}/?expand[]=product`)),
  );
  displayCache.set(id, { price, at: Date.now() });
  return price;
}

export type Catalogue = {
  paywall: boolean;
  decided: boolean;
  source: "env" | "metadata" | "none";
  platformName: string;
  prices: CataloguePrice[];
  settings: { access: Access; amount: number | null } | null;
};

export async function resolveCatalogue(): Promise<Catalogue> {
  const env = envPriceIds();
  const { info, platformName } = await readAppPaymentInfo();
  const settings = info ? { access: info.access, amount: info.amount } : null;
  if (env.length) {
    const prices: CataloguePrice[] = [];
    for (const id of env) prices.push(await fetchPriceDisplay(id));
    return { paywall: true, decided: true, source: "env", platformName, prices, settings };
  }
  if (!info)
    return { paywall: false, decided: false, source: "none", platformName, prices: [], settings };
  if (info.access === "free" || !info.stripe.price_id)
    return { paywall: false, decided: true, source: "metadata", platformName, prices: [], settings };
  return {
    paywall: true,
    decided: true,
    source: "metadata",
    platformName,
    prices: [
      {
        id: info.stripe.price_id,
        productId: info.stripe.product_id ?? "",
        name: info.name || planName(info.access),
        unitAmount: info.amount ?? 0,
        currency: info.currency ?? "usd",
        interval: info.access === "monthly" ? "month" : null,
      },
    ],
    settings,
  };
}

// Checkout runs through the platform's generic Stripe proxy in the shape the
// DM's own paywall expects (customer metadata.ibl_username, session metadata
// {ibl_username, ibl_user_id, app}); the DM's per-user paywall would refuse a
// buyer who is not a member yet.

const escapeSearchValue = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export async function findOrCreateCustomer(buyer: PaywallUser): Promise<string> {
  const qs = new URLSearchParams({
    query: `metadata['ibl_username']:'${escapeSearchValue(buyer.username)}'`,
    limit: "1",
  });
  const found = await dmJson(await dmPlatformFetch(`/customers/search/?${qs}`));
  const hit = found?.data?.[0]?.id;
  if (hit) return String(hit);
  const created = await dmJson(
    await dmPlatformFetch("/customers/", {
      method: "POST",
      body: JSON.stringify({
        ...(buyer.email && { email: buyer.email }),
        metadata: { ibl_username: buyer.username },
      }),
    }),
  );
  return String(created.id);
}

export async function createCheckout(
  buyer: PaywallUser,
  priceId: string,
  origin: string,
  customerId?: string,
): Promise<{ checkout_url: string; session_id: string }> {
  const price = (await resolveCatalogue()).prices.find((p) => p.id === priceId);
  const mode = price?.interval ? "subscription" : "payment";
  const customer = customerId ?? (await findOrCreateCustomer(buyer));
  const session = await dmJson(
    await dmPlatformFetch("/checkout-sessions/", {
      method: "POST",
      body: JSON.stringify({
        mode,
        customer,
        line_items: [{ price: priceId, quantity: 1 }],
        // Literal Stripe placeholder; cancel carries its own marker so it never restarts checkout.
        success_url: `${origin}/join?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/join?canceled=1`,
        metadata: {
          ibl_username: buyer.username,
          ibl_user_id: String(buyer.userId),
          app: paywallSlug(),
        },
      }),
    }),
  );
  return { checkout_url: String(session.url ?? ""), session_id: String(session.id ?? "") };
}

const ACTIVE_SUBSCRIPTION = new Set(["active", "trialing"]);

/** What this customer already holds for this app: a live subscription or a paid session. */
export async function existingEntitlement(
  customerId: string,
): Promise<{ kind: "subscription" | "payment"; session_id: string | null } | null> {
  const slug = paywallSlug();
  const subs = await dmJson(
    await dmPlatformFetch(
      `/subscriptions/?${new URLSearchParams({ customer: customerId, status: "active", limit: "10" })}`,
    ),
  ).catch(() => null);
  const liveSub = ((subs?.data ?? []) as any[]).find((sub) =>
    ACTIVE_SUBSCRIPTION.has(String(sub?.status)),
  );
  const sessions = await dmJson(
    await dmPlatformFetch(
      `/checkout-sessions/?${new URLSearchParams({ customer: customerId, status: "complete", limit: "10" })}`,
    ),
  ).catch(() => null);
  const paid = ((sessions?.data ?? []) as any[]).filter(
    (cs) => cs?.metadata?.app === slug && cs?.status === "complete",
  );
  const paidSub = paid.find((cs) => cs.mode === "subscription" && liveSub && cs.subscription === liveSub.id);
  if (paidSub) return { kind: "subscription", session_id: String(paidSub.id) };
  const paidOnce = paid.find((cs) => cs.mode !== "subscription" && cs.payment_status === "paid");
  if (paidOnce) return { kind: "payment", session_id: String(paidOnce.id) };
  return null;
}

function sessionPaid(session: any): boolean {
  if (session?.status !== "complete") return false;
  if (session.mode !== "subscription") return session.payment_status === "paid";
  const sub = session.subscription;
  return !!sub && typeof sub === "object" && ACTIVE_SUBSCRIPTION.has(String(sub.status));
}

/** The DM's admin link API. */
async function setMembership(userId: number, active: boolean): Promise<void> {
  await dmJson(
    await fetch(`${config.dmUrl()}/api/core/users/platforms/`, {
      method: "POST",
      headers: { Authorization: platformHeader(), "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, platform_key: config.mainTenantKey(), active }),
      cache: "no-store",
    }),
  );
}

export async function retrieveSession(sessionId: string): Promise<any> {
  return dmJson(
    await dmPlatformFetch(
      `/checkout-sessions/${encodeURIComponent(sessionId)}/?expand[]=subscription`,
    ),
  );
}

export function sessionBuyer(session: any): { userId: number; username: string } | null {
  const m = session?.metadata ?? {};
  if (m.app !== paywallSlug() || !m.ibl_username || !m.ibl_user_id) return null;
  return { userId: Number(m.ibl_user_id), username: String(m.ibl_username) };
}

/** Paid → the buyer becomes a member and the DM records the payment. False while unpaid. */
export async function joinFromSession(session: any, fallback?: PaywallUser): Promise<boolean> {
  const buyer =
    sessionBuyer(session) ??
    (fallback && session?.metadata?.app === paywallSlug() ? fallback : null);
  if (!buyer)
    throw new PaywallUpstreamError(403, { error: "This checkout session is not this app's" });
  if (!sessionPaid(session)) return false;
  await setMembership(buyer.userId, true);
  const qs = new URLSearchParams({ app: paywallSlug(), session_id: String(session?.id ?? "") });
  await dmPaywallFetch(buyer.username, `/paywall/access/?${qs}`).catch((e: unknown) =>
    console.error("[paywall] ledger update failed:", e),
  );
  return true;
}

export async function verifyAndJoin(buyer: PaywallUser, sessionId: string): Promise<boolean> {
  const session = await retrieveSession(sessionId);
  if (session?.metadata?.ibl_username !== buyer.username)
    throw new PaywallUpstreamError(403, { error: "This checkout session is not yours" });
  return joinFromSession(session, buyer);
}

export type LedgerRow = {
  id: number;
  username: string;
  mode: "subscription" | "payment" | string;
  status: string;
  stripe_session_id: string;
  stripe_subscription_id: string | null;
  created_at: string;
};

export async function recordedPayments(username: string): Promise<LedgerRow[]> {
  const qs = new URLSearchParams({ app: paywallSlug(), username, limit: "10" });
  const body = await dmJson(await dmPlatformFetch(`/paywall/payments/?${qs}`));
  const rows = ((body?.results ?? []) as LedgerRow[]).slice();
  rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return rows;
}

export async function isRecordedPayer(username: string): Promise<boolean> {
  return (await recordedPayments(username)).length > 0;
}

export async function liveAccess(username: string): Promise<{ has_access: boolean }> {
  const qs = new URLSearchParams({ app: paywallSlug() });
  const body = await dmJson(await dmPaywallFetch(username, `/paywall/access/?${qs}`));
  return { has_access: !!body?.has_access };
}

const DEAD_SUBSCRIPTION = new Set(["canceled", "unpaid", "incomplete_expired"]);

/**
 * A payer keeps access unless the DM says no AND the payment is older than a
 * day AND Stripe itself reports the subscription as dead. One-time payments
 * never lapse; anything ambiguous keeps the member in.
 */
export async function payerStanding(
  rows: LedgerRow[],
  username: string,
): Promise<{ has_access: boolean; reason: string }> {
  const latest = rows[0];
  if (!latest) return { has_access: true, reason: "never paid" };
  if (latest.mode !== "subscription") return { has_access: true, reason: "one-time payment" };
  const live = await liveAccess(username).catch(() => null);
  if (!live || live.has_access) return { has_access: true, reason: live ? "live" : "dm unavailable" };
  if (Date.now() - new Date(latest.created_at).getTime() < 24 * 60 * 60 * 1000)
    return { has_access: true, reason: "recent payment" };
  const subId = latest.stripe_subscription_id;
  if (!subId) return { has_access: true, reason: "no subscription id on the ledger" };
  const sub = await dmJson(await dmPlatformFetch(`/subscriptions/${encodeURIComponent(subId)}/`)).catch(
    () => null,
  );
  const status = String(sub?.status ?? "");
  if (sub && DEAD_SUBSCRIPTION.has(status)) return { has_access: false, reason: `subscription ${status}` };
  return { has_access: true, reason: sub ? `subscription ${status || "unknown"}` : "stripe unavailable" };
}

export const endMembership = (userId: number) => setMembership(userId, false);

/** Idempotent: an existing active link stays active. */
export const assertMembership = (userId: number) => setMembership(userId, true);
