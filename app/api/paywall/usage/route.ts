import { NextRequest, NextResponse } from "next/server";
import { allowanceFor } from "@/lib/entitlement";
import { PaywallUpstreamError, userFromRequest } from "@/lib/paywall";

export const dynamic = "force-dynamic";

/** The caller's tier and free-video allowance for this month. */
export async function GET(req: NextRequest) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  try {
    return NextResponse.json(await allowanceFor(user), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof PaywallUpstreamError) return NextResponse.json(e.body, { status: e.status });
    throw e;
  }
}
