import { NextRequest, NextResponse } from "next/server";

import { resolveHeygenKey } from "@/app/api/heygen/[...path]/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Can the server actually reach the provider on this tenant's behalf?
 *
 * The client used to probe the platform's credential endpoint directly, which
 * reports a masked credential as "present" — so the UI unlocked and every call
 * then failed with an opaque 401. Asking the server, which is the only party
 * that can tell a usable key from a masked one, keeps the gate honest.
 *
 * A static segment takes precedence over the sibling [...path] catch-all, so
 * this never proxies upstream.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const dmToken = auth.startsWith("Token ") ? auth.slice(6).trim() : "";
  const tenant = req.headers.get("x-platform")?.trim() ?? "";
  if (!dmToken || !tenant) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  try {
    await resolveHeygenKey(tenant, dmToken);
    return NextResponse.json(
      { ok: true, source: process.env.HEYGEN_API_KEY?.trim() ? "server" : "tenant" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ ok: false, reason }, { headers: { "Cache-Control": "no-store" } });
  }
}
