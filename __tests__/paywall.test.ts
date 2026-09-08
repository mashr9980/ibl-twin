import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// lib/paywall.ts: which credential goes on the wire, the checkout minted in
// the DM's shape, the return verified before anyone is linked, the public
// metadata store, and the double-charge guard.

const ENV_KEYS = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_MAIN_TENANT_KEY",
  "IBLAI_API_KEY",
  "IBLAI_ADMIN_TOKEN",
  "PAYWALL_APP_SLUG",
  "PAYWALL_PRICE_IDS",
  "IBLAI_APP_BASE_URL",
  "NEXT_PUBLIC_APP_NAME",
] as const;
const saved: Record<string, string | undefined> = {};

const DM = "https://api.example.edu/dm";
const load = async () => await import("@/lib/paywall");

type Call = { url: string; init?: RequestInit };
let calls: Call[] = [];

const stubFetch = (impl: (url: string, init?: RequestInit) => Response | Promise<Response>) => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      // The platform's self-join switch (closed here) is read by the catalogue.
      if (url.includes("/platforms/config/public/")) return Response.json({ allow_self_linking: false });
      calls.push({ url, init });
      return impl(url, init);
    }),
  );
};

const header = (c: Call) => ((c.init?.headers ?? {}) as Record<string, string>).Authorization;

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.edu";
  process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = "testorg";
  process.env.IBLAI_API_KEY = "platform-key";
  delete process.env.IBLAI_ADMIN_TOKEN;
  process.env.PAYWALL_APP_SLUG = "ibl-twin";
  delete process.env.PAYWALL_PRICE_IDS;
  delete process.env.IBLAI_APP_BASE_URL;
  process.env.NEXT_PUBLIC_APP_NAME = "memorare twin";
  vi.resetModules();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
});

describe("platform credential", () => {
  it("prefers the API token, falls back to the admin session token, and names the gap", async () => {
    let m = await load();
    expect(m.platformCredentialProblem()).toBe("");

    delete process.env.IBLAI_API_KEY;
    process.env.IBLAI_ADMIN_TOKEN = "admin-session";
    vi.resetModules();
    m = await load();
    expect(m.platformCredentialProblem()).toBe("");

    delete process.env.IBLAI_ADMIN_TOKEN;
    vi.resetModules();
    m = await load();
    expect(m.platformCredentialProblem()).toMatch(/IBLAI_API_KEY/);
    expect(m.platformCredentialProblem()).toMatch(/IBLAI_ADMIN_TOKEN/);
  });

  it("treats the template placeholder as no key", async () => {
    process.env.IBLAI_API_KEY = "your-token";
    const m = await load();
    expect(m.platformCredentialProblem()).not.toBe("");
  });
});

describe("resolveUser / userFromRequest", () => {
  it("maps the DM's token/verify answer to the buyer and caches it", async () => {
    const { userFromRequest } = await load();
    stubFetch(() => Response.json({ user_id: 7, username: "jane", email: "jane@x.io" }));
    const req = new Request("http://app.test/api/paywall/access", {
      headers: { Authorization: "Token dm-abc" },
    });
    expect(await userFromRequest(req)).toEqual({ userId: 7, username: "jane", email: "jane@x.io" });
    expect(calls[0].url).toBe(`${DM}/api/core/token/verify/`);
    expect(header(calls[0])).toBe("Token dm-abc");
    await userFromRequest(req);
    expect(calls).toHaveLength(1);
  });

  it("is null without a Token header or when the DM refuses", async () => {
    const { userFromRequest } = await load();
    stubFetch(() => new Response("nope", { status: 401 }));
    expect(await userFromRequest(new Request("http://app.test/"))).toBeNull();
    expect(
      await userFromRequest(
        new Request("http://app.test/", { headers: { Authorization: "Bearer dm-abc" } }),
      ),
    ).toBeNull();
    expect(
      await userFromRequest(
        new Request("http://app.test/", { headers: { Authorization: "Token bad" } }),
      ),
    ).toBeNull();
  });
});

describe("appBaseUrl", () => {
  it("uses the request origin unless IBLAI_APP_BASE_URL overrides it", async () => {
    const { appBaseUrl } = await load();
    expect(appBaseUrl({ url: "http://localhost:3000/api/paywall/checkout" })).toBe(
      "http://localhost:3000",
    );
    process.env.IBLAI_APP_BASE_URL = "https://ibl.vault-mind.com/";
    expect(appBaseUrl({ url: "http://localhost:3000/x" })).toBe("https://ibl.vault-mind.com");
    process.env.IBLAI_APP_BASE_URL = "vault-mind.com";
    expect(() => appBaseUrl({ url: "http://localhost:3000/x" })).toThrow(/IBLAI_APP_BASE_URL/);
  });
});

describe("catalogue (the tenant's public metadata)", () => {
  const META = `${DM}/api/core/orgs/testorg/metadata/`;
  const monthly = {
    version: 1,
    access: "monthly",
    amount: 500,
    currency: "usd",
    stripe: { product_id: "prod_1", price_id: "price_1" },
    updated_at: "2026-09-08T00:00:00.000Z",
    updated_by: "mashr9980",
  };

  it("reads apps.<slug> without any credential and sells the recorded price", async () => {
    const { resolveCatalogue, allowedPriceIds } = await load();
    stubFetch(() =>
      Response.json({ platform_key: "testorg", platform_name: "Twin", metadata: { apps: { "ibl-twin": monthly } } }),
    );
    const c = await resolveCatalogue();
    expect(calls[0].url).toBe(META);
    expect(header(calls[0])).toBeUndefined();
    expect(c.paywall).toBe(true);
    expect(c.decided).toBe(true);
    expect(c.prices).toEqual([
      {
        id: "price_1",
        productId: "prod_1",
        name: "Monthly access",
        unitAmount: 500,
        currency: "usd",
        interval: "month",
      },
    ]);
    expect(await allowedPriceIds()).toEqual(["price_1"]);
    // cached for the process
    expect(calls).toHaveLength(1);
  });

  it("is free and undecided while nothing is recorded, free and decided for a free choice", async () => {
    const { resolveCatalogue, allowedPriceIds, invalidateAppPaymentInfo } = await load();
    stubFetch(() => Response.json({ platform_key: "testorg", metadata: { is_advertising: false } }));
    let c = await resolveCatalogue();
    expect(c).toMatchObject({ paywall: false, decided: false, source: "none", prices: [] });
    expect(await allowedPriceIds()).toEqual([]);

    invalidateAppPaymentInfo();
    stubFetch(() =>
      Response.json({
        platform_key: "testorg",
        metadata: { apps: { "ibl-twin": { ...monthly, access: "free", amount: null, stripe: { product_id: null, price_id: null } } } },
      }),
    );
    c = await resolveCatalogue();
    expect(c).toMatchObject({ paywall: false, decided: true, source: "metadata", prices: [] });
  });

  it("lets PAYWALL_PRICE_IDS win and describes those prices from Stripe on the key owner's path", async () => {
    process.env.PAYWALL_PRICE_IDS = "price_env";
    const { resolveCatalogue } = await load();
    stubFetch((url) => {
      if (url.endsWith("/token/verify/")) return Response.json({ username: "owner" });
      if (url.includes("/metadata/")) return Response.json({ platform_key: "testorg", metadata: {} });
      return Response.json({
        id: "price_env",
        unit_amount: 1900,
        currency: "usd",
        recurring: { interval: "month" },
        product: { id: "prod_env", name: "Twin" },
      });
    });
    const c = await resolveCatalogue();
    expect(c.source).toBe("env");
    expect(c.prices[0]).toMatchObject({ id: "price_env", productId: "prod_env", name: "Twin", interval: "month" });
    const stripeCall = calls.find((x) => x.url.includes("/prices/price_env/"));
    expect(stripeCall?.url).toBe(
      `${DM}/api/ai-mentor/orgs/testorg/users/owner/providers/stripe/payments/prices/price_env/?expand[]=product`,
    );
    expect(header(stripeCall!)).toBe("Api-Token platform-key");
  });
});

describe("createCheckout", () => {
  it("mints a Customer and a Checkout Session in the DM's own shape, as the platform", async () => {
    const { createCheckout } = await load();
    stubFetch((url, init) => {
      if (url.endsWith("/token/verify/")) return Response.json({ username: "owner" });
      if (url.includes("/metadata/"))
        return Response.json({
          platform_key: "testorg",
          metadata: {
            apps: {
              "ibl-twin": {
                access: "monthly",
                amount: 500,
                currency: "usd",
                stripe: { product_id: "prod_1", price_id: "price_1" },
              },
            },
          },
        });
      if (url.includes("/customers/search/")) return Response.json({ data: [] });
      if (url.endsWith("/customers/")) return Response.json({ id: "cus_1" });
      if (url.endsWith("/checkout-sessions/") && init?.method === "POST")
        return Response.json({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
      throw new Error(`unexpected ${url}`);
    });
    const out = await createCheckout(
      { userId: 7, username: "jane", email: "jane@x.io" },
      "price_1",
      "http://localhost:3000",
    );
    expect(out).toEqual({ checkout_url: "https://checkout.stripe.com/c/pay/cs_1", session_id: "cs_1" });

    const customer = calls.find((c) => c.url.endsWith("/customers/"))!;
    expect(JSON.parse(customer.init!.body as string)).toEqual({
      email: "jane@x.io",
      metadata: { ibl_username: "jane" },
    });
    const session = calls.find((c) => c.url.endsWith("/checkout-sessions/"))!;
    expect(session.url).toMatch(/\/users\/owner\/providers\/stripe\/payments\/checkout-sessions\/$/);
    expect(header(session)).toBe("Api-Token platform-key");
    expect(JSON.parse(session.init!.body as string)).toEqual({
      mode: "subscription",
      customer: "cus_1",
      line_items: [{ price: "price_1", quantity: 1 }],
      success_url: "http://localhost:3000/join?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: "http://localhost:3000/join?canceled=1",
      metadata: { ibl_username: "jane", ibl_user_id: "7", app: "ibl-twin" },
    });
  });

  it("acts with the admin session token when that is the only credential", async () => {
    delete process.env.IBLAI_API_KEY;
    process.env.IBLAI_ADMIN_TOKEN = "admin-session";
    const { keyOwnerUsername } = await load();
    stubFetch(() => Response.json({ username: "mashr9980" }));
    expect(await keyOwnerUsername()).toBe("mashr9980");
    expect(header(calls[0])).toBe("Token admin-session");
  });
});

describe("joining from a session", () => {
  const paidSession = {
    id: "cs_1",
    status: "complete",
    mode: "subscription",
    subscription: { status: "active" },
    metadata: { ibl_username: "jane", ibl_user_id: "7", app: "ibl-twin" },
  };

  it("links the buyer named on a paid session and records the payment in the ledger", async () => {
    const { joinFromSession } = await load();
    stubFetch((url) => {
      if (url.endsWith("/token/verify/")) return Response.json({ username: "owner" });
      return Response.json({ ok: true });
    });
    expect(await joinFromSession(paidSession)).toBe(true);
    const link = calls.find((c) => c.url === `${DM}/api/core/users/platforms/`)!;
    expect(header(link)).toBe("Api-Token platform-key");
    expect(JSON.parse(link.init!.body as string)).toEqual({
      user_id: 7,
      platform_key: "testorg",
      active: true,
    });
    const ledger = calls.find((c) => c.url.includes("/paywall/access/"))!;
    expect(ledger.url).toBe(
      `${DM}/api/ai-mentor/orgs/testorg/users/jane/providers/stripe/payments/paywall/access/?app=ibl-twin&session_id=cs_1`,
    );
  });

  it("does not link while the session is unpaid, and refuses another app's session", async () => {
    const { joinFromSession, PaywallUpstreamError } = await load();
    stubFetch(() => Response.json({}));
    expect(await joinFromSession({ ...paidSession, status: "open" })).toBe(false);
    expect(
      await joinFromSession({ ...paidSession, subscription: { status: "incomplete" } }),
    ).toBe(false);
    expect(calls.filter((c) => c.url.endsWith("/users/platforms/"))).toHaveLength(0);
    await expect(
      joinFromSession({ ...paidSession, metadata: { ...paidSession.metadata, app: "other" } }),
    ).rejects.toBeInstanceOf(PaywallUpstreamError);
  });

  it("verifyAndJoin refuses a session that is not the caller's", async () => {
    const { verifyAndJoin } = await load();
    stubFetch((url) => {
      if (url.endsWith("/token/verify/")) return Response.json({ username: "owner" });
      return Response.json(paidSession);
    });
    await expect(
      verifyAndJoin({ userId: 9, username: "mallory", email: "" }, "cs_1"),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("accessForPrice", () => {
  it("maps one-off and every-month prices onto the two plans, and nothing else", async () => {
    const { accessForPrice } = await load();
    expect(accessForPrice({ unit_amount: 100 })).toBe("one_time");
    expect(accessForPrice({ recurring: { interval: "month", interval_count: 1 } })).toBe("monthly");
    expect(accessForPrice({ recurring: { interval: "month" } })).toBe("monthly");
    expect(accessForPrice({ recurring: { interval: "month", interval_count: 3 } })).toBeNull();
    expect(accessForPrice({ recurring: { interval: "year", interval_count: 1 } })).toBeNull();
    expect(accessForPrice({ recurring: { interval: "month", interval_count: 1, usage_type: "metered" } })).toBeNull();
  });

  it("shows the recorded plan name on the paywall when there is one", async () => {
    const { resolveCatalogue } = await load();
    stubFetch(() =>
      Response.json({
        platform_key: "testorg",
        metadata: {
          apps: {
            "ibl-twin": {
              version: 1,
              access: "monthly",
              amount: 800,
              currency: "usd",
              name: "Memorare Twin",
              stripe: { product_id: "prod_x", price_id: "price_x", managed: false },
            },
          },
        },
      }),
    );
    const c = await resolveCatalogue();
    expect(c.prices[0]).toMatchObject({ id: "price_x", name: "Memorare Twin", unitAmount: 800, interval: "month" });
  });
});

describe("existingEntitlement", () => {
  const owner = (url: string) => url.endsWith("/token/verify/");

  it("finds a live subscription paid through this app's session", async () => {
    const { existingEntitlement } = await load();
    stubFetch((url) => {
      if (owner(url)) return Response.json({ username: "owner" });
      if (url.includes("/subscriptions/?")) return Response.json({ data: [{ id: "sub_1", status: "active" }] });
      if (url.includes("/checkout-sessions/?"))
        return Response.json({
          data: [
            { id: "cs_other", status: "complete", mode: "subscription", subscription: "sub_1", metadata: { app: "other" } },
            { id: "cs_1", status: "complete", mode: "subscription", subscription: "sub_1", metadata: { app: "ibl-twin" } },
          ],
        });
      throw new Error(`unexpected ${url}`);
    });
    expect(await existingEntitlement("cus_1")).toEqual({ kind: "subscription", session_id: "cs_1" });
    const subs = calls.find((c) => c.url.includes("/subscriptions/?"))!;
    expect(subs.url).toContain("customer=cus_1&status=active");
  });

  it("finds a paid one-time session, ignores a canceled subscription, and is null for nothing", async () => {
    const { existingEntitlement } = await load();
    stubFetch((url) => {
      if (owner(url)) return Response.json({ username: "owner" });
      if (url.includes("/subscriptions/?")) return Response.json({ data: [] });
      if (url.includes("/checkout-sessions/?"))
        return Response.json({
          data: [
            { id: "cs_sub", status: "complete", mode: "subscription", subscription: "sub_dead", metadata: { app: "ibl-twin" } },
            { id: "cs_once", status: "complete", mode: "payment", payment_status: "paid", metadata: { app: "ibl-twin" } },
          ],
        });
      throw new Error(`unexpected ${url}`);
    });
    expect(await existingEntitlement("cus_1")).toEqual({ kind: "payment", session_id: "cs_once" });

    stubFetch((url) => {
      if (owner(url)) return Response.json({ username: "owner" });
      return Response.json({ data: [] });
    });
    expect(await existingEntitlement("cus_1")).toBeNull();
  });
});
