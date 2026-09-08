import { NextRequest, NextResponse } from "next/server";
import {
  PaywallUpstreamError,
  allowedPriceIds,
  assertMembership,
  endMembership,
  payerStanding,
  platformCredentialProblem,
  recordedPayments,
  userFromRequest,
  verifyAndJoin,
} from "@/lib/paywall";

export const dynamic = "force-dynamic";

/**
 * With `session_id`: verify the caller's checkout and make them a member.
 * Without: the caller's standing; `ensure=1` re-asserts a live payer's link.
 */
export async function GET(req: NextRequest) {
  const problem = platformCredentialProblem();
  if (problem) return NextResponse.json({ error: problem }, { status: 500 });
  const user = await userFromRequest(req);
  const sessionId = req.nextUrl.searchParams.get("session_id");
  try {
    if (!user) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
    if (sessionId) return NextResponse.json({ joined: await verifyAndJoin(user, sessionId) });
    if ((await allowedPriceIds()).length === 0)
      return NextResponse.json({ has_access: true, paywall: false });
    const rows = await recordedPayments(user.username);
    if (rows.length === 0) return NextResponse.json({ has_access: true, payer: false });
    const standing = await payerStanding(rows, user.username);
    if (!standing.has_access) {
      await endMembership(user.userId);
      return NextResponse.json({ has_access: false, payer: true, reason: standing.reason });
    }
    let relinked = false;
    if (req.nextUrl.searchParams.get("ensure") === "1") {
      await assertMembership(user.userId);
      relinked = true;
    }
    return NextResponse.json({ has_access: true, payer: true, relinked, reason: standing.reason });
  } catch (e) {
    if (e instanceof PaywallUpstreamError) return NextResponse.json(e.body, { status: e.status });
    throw e;
  }
}
