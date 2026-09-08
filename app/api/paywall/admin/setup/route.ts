import { NextRequest, NextResponse } from "next/server";
import config from "@/lib/iblai/config";
import {
  ACCESS_VALUES,
  PaywallUpstreamError,
  accessForPrice,
  dmJson,
  dmStripeFetchAs,
  invalidateAppPaymentInfo,
  paywallSlug,
  planName,
  readAppPaymentInfo,
  writeAppPaymentInfo,
  type Access,
  type AppPaymentInfo,
  type DmInit,
} from "@/lib/paywall";
import { adminCaller, failure, isResponse, jsonBody, setSelfJoin } from "@/lib/paywall-admin";

export const dynamic = "force-dynamic";

/**
 * Publish the plan: `{ price_id }` adopts a price the owner made in Stripe,
 * `{ access, amount }` creates one. Every platform call carries the admin's
 * own token. Self-join is always closed; there is no free option.
 */
export async function POST(req: NextRequest) {
  const caller = await adminCaller(req);
  if (isResponse(caller)) return caller;
  const { access, amount, price_id } = await jsonBody(req);
  const adopt = typeof price_id === "string" && price_id.trim() !== "";
  if (!adopt && (!ACCESS_VALUES.includes(access as Access) || access === "free"))
    return NextResponse.json({ error: "access must be one_time or monthly" }, { status: 400 });
  if (!adopt && (!Number.isInteger(amount) || (amount as number) <= 0))
    return NextResponse.json(
      { error: "amount must be a positive integer (cents)" },
      { status: 400 },
    );

  const key = req.headers.get("idempotency-key");
  const idem = (suffix: string): Record<string, string> =>
    key ? { "Idempotency-Key": `${key}-${suffix}` } : {};
  const stripe = (path: string, init?: DmInit) =>
    dmStripeFetchAs(caller.token, caller.username, path, init).then(dmJson);

  try {
    invalidateAppPaymentInfo();
    const { info: current, platformName } = await readAppPaymentInfo();
    let productId = current?.stripe.product_id ?? null;
    let priceId: string | null = null;
    let planAccess = access as Access;
    let planAmount = amount as number;
    let planName_: string | null = null;
    let managed = true;

    if (adopt) {
      const id = (price_id as string).trim();
      const price = await stripe(`/prices/${encodeURIComponent(id)}/?expand[]=product`);
      if (price?.active === false)
        return NextResponse.json({ error: "That price is archived in Stripe." }, { status: 400 });
      if (String(price?.currency ?? "").toLowerCase() !== "usd")
        return NextResponse.json({ error: "Only USD prices are supported." }, { status: 400 });
      const mapped = accessForPrice(price);
      if (!mapped)
        return NextResponse.json(
          { error: "Only one-off prices or prices billed every month are supported." },
          { status: 400 },
        );
      const product =
        typeof price.product === "object" && price.product
          ? price.product
          : await stripe(`/products/${encodeURIComponent(String(price.product))}/`);
      if (product?.active === false)
        return NextResponse.json({ error: "That price's product is archived in Stripe." }, { status: 400 });
      if (product?.metadata?.app !== paywallSlug())
        await stripe(`/products/${encodeURIComponent(String(product.id))}/`, {
          method: "POST",
          headers: idem("tag"),
          body: JSON.stringify({ metadata: { ...product?.metadata, app: paywallSlug() } }),
        });
      // A price this app made earlier is retired; one the owner made is theirs to keep.
      if (
        current?.stripe.price_id &&
        current.stripe.price_id !== price.id &&
        current.stripe.managed !== false
      )
        await stripe(`/prices/${encodeURIComponent(current.stripe.price_id)}/`, {
          method: "POST",
          headers: idem("archive"),
          body: JSON.stringify({ active: false }),
        });
      productId = String(product.id);
      priceId = String(price.id);
      planAccess = mapped;
      planAmount = Number(price.unit_amount ?? 0);
      planName_ = product?.name ? String(product.name) : null;
      managed = false;
    } else {
      if (current?.stripe.price_id && current.stripe.managed !== false)
        await stripe(`/prices/${encodeURIComponent(current.stripe.price_id)}/`, {
          method: "POST",
          headers: idem("archive"),
          body: JSON.stringify({ active: false }),
        });
      if (productId && current?.stripe.managed === false) productId = null;
      if (productId) {
        let product: any = null;
        try {
          product = await stripe(`/products/${encodeURIComponent(productId)}/`);
        } catch (e) {
          if (!(e instanceof PaywallUpstreamError && e.status === 404)) throw e;
        }
        if (product?.active === false || product?.metadata?.app !== paywallSlug())
          productId = null;
      }
      if (!productId) {
        const product = await stripe("/products/", {
          method: "POST",
          headers: idem("product"),
          body: JSON.stringify({
            name: config.appName() || platformName || paywallSlug(),
            metadata: { app: paywallSlug() },
          }),
        });
        productId = String(product.id);
      }
      const price = await stripe("/prices/", {
        method: "POST",
        headers: idem("price"),
        body: JSON.stringify({
          product: productId,
          unit_amount: amount,
          currency: "usd",
          nickname: planName(access as Access),
          ...(access === "monthly" && { recurring: { interval: "month" } }),
        }),
      });
      priceId = String(price.id);
      planName_ = config.appName() || platformName || null;
    }

    await setSelfJoin(caller.token, false);

    // Every key is written: the DM merges and cannot delete keys.
    const info: AppPaymentInfo = {
      version: 1,
      access: planAccess,
      amount: planAmount,
      currency: "usd",
      name: planName_ ?? config.appName() ?? null,
      stripe: { product_id: productId, price_id: priceId, managed },
      updated_at: new Date().toISOString(),
      updated_by: caller.username,
    };
    await writeAppPaymentInfo(caller.token, info);
    return NextResponse.json({ info });
  } catch (e) {
    return failure(e);
  }
}
