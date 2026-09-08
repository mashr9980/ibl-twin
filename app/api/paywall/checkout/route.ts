import { NextRequest, NextResponse } from "next/server";
import {
  PaywallUpstreamError,
  allowedPriceIds,
  appBaseUrl,
  assertMembership,
  createCheckout,
  existingEntitlement,
  findOrCreateCustomer,
  joinFromSession,
  payerStanding,
  platformCredentialProblem,
  recordedPayments,
  retrieveSession,
  userFromRequest,
} from "@/lib/paywall";

export const dynamic = "force-dynamic";

/**
 * For the signed-in caller: `{ already: true }` when they hold a live payment
 * (membership re-asserted), else `{ checkout_url }`; 404 `no_plan` while
 * nothing is published.
 */
export async function POST(req: NextRequest) {
  const problem = platformCredentialProblem();
  if (problem) return NextResponse.json({ error: problem }, { status: 500 });
  const { price_id } = await req.json().catch(() => ({}) as any);
  try {
    const buyer = await userFromRequest(req);
    if (!buyer) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
    const allowed = await allowedPriceIds();
    if (allowed.length === 0)
      return NextResponse.json(
        { error: "No plan is published yet, so joining is not open.", code: "no_plan" },
        { status: 404 },
      );
    const priceId = price_id || (allowed.length === 1 ? allowed[0] : "");
    if (!priceId || !allowed.includes(priceId))
      return NextResponse.json({ error: "Unknown price_id" }, { status: 400 });

    const rows = await recordedPayments(buyer.username);
    if (rows.length && (await payerStanding(rows, buyer.username)).has_access) {
      await assertMembership(buyer.userId);
      return NextResponse.json({ already: true, source: "ledger" });
    }
    const customer = await findOrCreateCustomer(buyer);
    const held = await existingEntitlement(customer);
    if (held) {
      if (held.session_id) await joinFromSession(await retrieveSession(held.session_id), buyer);
      else await assertMembership(buyer.userId);
      return NextResponse.json({ already: true, source: `stripe:${held.kind}` });
    }
    return NextResponse.json(await createCheckout(buyer, priceId, appBaseUrl(req), customer));
  } catch (e) {
    if (e instanceof PaywallUpstreamError) return NextResponse.json(e.body, { status: e.status });
    throw e;
  }
}
