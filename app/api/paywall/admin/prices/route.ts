import { NextRequest, NextResponse } from "next/server";
import { accessForPrice, dmJson, dmStripeFetchAs, toCataloguePrice } from "@/lib/paywall";
import { adminCaller, failure, isResponse } from "@/lib/paywall-admin";

export const dynamic = "force-dynamic";

/** The active prices on the workspace's Stripe account, read with the admin's own token. */
export async function GET(req: NextRequest) {
  const caller = await adminCaller(req);
  if (isResponse(caller)) return caller;
  try {
    const qs = new URLSearchParams({ active: "true", limit: "100" });
    qs.append("expand[]", "data.product");
    const body = await dmJson(
      await dmStripeFetchAs(caller.token, caller.username, `/prices/?${qs}`),
    );
    const prices = ((body?.data ?? []) as any[])
      .filter((p) => p?.active !== false && p?.product?.active !== false)
      .map((p) => ({
        ...toCataloguePrice(p),
        access: accessForPrice(p),
        sellable: String(p?.currency ?? "").toLowerCase() === "usd" && accessForPrice(p) !== null,
        created: Number(p?.created ?? 0),
      }))
      .sort((a, b) => b.created - a.created);
    return NextResponse.json({ prices }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return failure(e);
  }
}
