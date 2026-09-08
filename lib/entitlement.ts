// Who may generate, and how much. Server-only.
//
// Membership is free: anyone who signs in joins. Every member gets a monthly
// allowance of free videos; a paying member (a live subscription on the
// workspace's Stripe, per the platform ledger) and a workspace admin are
// unlimited. Counts live in lib/usage-store.ts; the tiers come from the
// platform (admin flag, payment ledger).
import config from "./iblai/config";
import { dmJson, payerStanding, recordedPayments, type PaywallUser } from "./paywall";
import { currentPeriod, getUsage, periodEnd } from "./usage-store";

export type Tier = "admin" | "plus" | "free";

export type Allowance = {
  tier: Tier;
  /** Videos generated this period (free tier only; 0 otherwise). */
  used: number;
  /** Free videos per period; null when unlimited. */
  limit: number | null;
  remaining: number | null;
  period: string;
  resets_at: string;
};

const DEFAULT_FREE_VIDEOS = 3;

/** FREE_VIDEOS_PER_MONTH, read at call time; a non-number falls back to the default. */
export function freeVideosPerMonth(): number {
  const raw = Number(process.env.FREE_VIDEOS_PER_MONTH ?? DEFAULT_FREE_VIDEOS);
  return Number.isInteger(raw) && raw >= 0 ? raw : DEFAULT_FREE_VIDEOS;
}

// Admin flags come from the platform's member list; cached briefly per user.
const adminCache = new Map<string, { admin: boolean; at: number }>();
const ADMIN_TTL_MS = 300_000;

export async function isPlatformAdmin(username: string): Promise<boolean> {
  const hit = adminCache.get(username);
  if (hit && Date.now() - hit.at < ADMIN_TTL_MS) return hit.admin;
  let admin = false;
  try {
    const qs = new URLSearchParams({ platform_key: config.mainTenantKey(), limit: "500" });
    const body = await dmJson(
      await fetch(`${config.dmUrl()}/api/core/platform/users/?${qs}`, {
        headers: { Authorization: config.platformAuth() },
        cache: "no-store",
      }),
    );
    const rows: any[] = Array.isArray(body) ? body : (body?.results ?? []);
    admin = rows.some((r) => r?.username === username && r?.is_admin === true);
  } catch (e) {
    console.error("[entitlement] admin lookup failed:", e);
  }
  adminCache.set(username, { admin, at: Date.now() });
  return admin;
}

export async function tierFor(user: PaywallUser): Promise<Tier> {
  if (await isPlatformAdmin(user.username)) return "admin";
  const rows = await recordedPayments(user.username).catch(() => []);
  if (rows.length && (await payerStanding(rows, user.username)).has_access) return "plus";
  return "free";
}

export async function allowanceFor(user: PaywallUser): Promise<Allowance> {
  const tier = await tierFor(user);
  const period = currentPeriod();
  const resets_at = periodEnd().toISOString();
  if (tier !== "free") return { tier, used: 0, limit: null, remaining: null, period, resets_at };
  const limit = freeVideosPerMonth();
  const { used } = await getUsage(user.username, period);
  return { tier, used, limit, remaining: Math.max(0, limit - used), period, resets_at };
}
