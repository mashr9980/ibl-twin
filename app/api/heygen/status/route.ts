import { NextRequest, NextResponse } from "next/server";

import { resolveHeygenKey } from "@/app/api/heygen/[...path]/route";
import { creditsFromQuota } from "@/lib/heygen/credential";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUOTA_URL = "https://api.heygen.com/v2/user/remaining_quota";
const QUOTA_TTL_MS = 60_000;
const quotaCache = new Map<string, { quota: number | null; expiresAt: number }>();

/** HeyGen's remaining API quota for this key, or null when it cannot be read. */
async function remainingQuota(apiKey: string): Promise<number | null> {
  const hit = quotaCache.get(apiKey);
  if (hit && hit.expiresAt > Date.now()) return hit.quota;
  let quota: number | null = null;
  try {
    const res = await fetch(QUOTA_URL, { headers: { "X-Api-Key": apiKey }, cache: "no-store" });
    const body = res.ok ? await res.json().catch(() => null) : null;
    const value = body?.data?.remaining_quota;
    quota = typeof value === "number" ? value : null;
  } catch {
    quota = null;
  }
  quotaCache.set(apiKey, { quota, expiresAt: Date.now() + QUOTA_TTL_MS });
  return quota;
}

/**
 * Can the server reach the provider on this tenant's behalf, and with how much
 * balance? Only the server can tell a usable key from a masked one, and only
 * it holds the key that the quota question needs.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const dmToken = auth.startsWith("Token ") ? auth.slice(6).trim() : "";
  const tenant = req.headers.get("x-platform")?.trim() ?? "";
  if (!dmToken || !tenant) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  try {
    const apiKey = await resolveHeygenKey(tenant, dmToken);
    const quota = await remainingQuota(apiKey);
    return NextResponse.json(
      {
        ok: true,
        source: process.env.HEYGEN_API_KEY?.trim() ? "server" : "tenant",
        credits: creditsFromQuota(quota),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ ok: false, reason }, { headers: { "Cache-Control": "no-store" } });
  }
}
