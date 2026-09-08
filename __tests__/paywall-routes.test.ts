import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// The /api/paywall route handlers, against a fetch stub that plays the DM.

const ENV_KEYS = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_MAIN_TENANT_KEY",
  "IBLAI_API_KEY",
  "IBLAI_ADMIN_TOKEN",
  "PAYWALL_APP_SLUG",
  "PAYWALL_PRICE_IDS",
  "NEXT_PUBLIC_APP_NAME",
] as const;
const saved: Record<string, string | undefined> = {};

const loadAccess = async () => await import("@/app/api/paywall/access/route");
const loadCheckout = async () => await import("@/app/api/paywall/checkout/route");
const loadPrices = async () => await import("@/app/api/paywall/prices/route");
const loadSetup = async () => await import("@/app/api/paywall/admin/setup/route");
const loadAdminPrices = async () => await import("@/app/api/paywall/admin/prices/route");

const DM = "https://api.example.edu/dm";
const META_URL = `${DM}/api/core/orgs/testorg/metadata/`;
const LINK_URL = `${DM}/api/core/users/platforms/`;
const CONFIG_URL = `${DM}/api/core/users/platforms/config/`;
const proxyFor = (username: string) =>
  `${DM}/api/ai-mentor/orgs/testorg/users/${username}/providers/stripe/payments`;

type Rec = { url: string; headers: Record<string, string>; method: string; body: any };
let dm: Rec[] = [];

const monthly = (over: Record<string, unknown> = {}) => ({
  version: 1,
  access: "monthly",
  amount: 500,
  currency: "usd",
  stripe: { product_id: "prod_1", price_id: "price_1" },
  updated_at: "2026-09-08T00:00:00.000Z",
  updated_by: "mashr9980",
  ...over,
});

const PUBLIC_CONFIG_URL = `${DM}/api/core/users/platforms/config/public/?platform_key=testorg`;

const stubFetch = ({
  member = true,
  apps = {} as Record<string, unknown>,
  selfJoin = false,
  admin = false,
  stripe = (_url: string, _init?: RequestInit) => Response.json({}),
}: {
  member?: boolean;
  apps?: Record<string, unknown>;
  selfJoin?: boolean;
  admin?: boolean;
  stripe?: (url: string, init?: RequestInit) => Response;
} = {}) => {
  dm = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      let body: any = null;
      try {
        body = init?.body ? JSON.parse(init.body as string) : null;
      } catch {
        body = init?.body;
      }
      dm.push({ url, headers, method: init?.method ?? "GET", body });
      if (url.includes("/api/core/token/verify/")) {
        if (headers.Authorization?.startsWith("Api-Token "))
          return Response.json({ user_id: 1, username: "owner", email: "owner@x.io" });
        return member
          ? Response.json({ user_id: 7, username: "jane", email: "jane@x.io" })
          : new Response("invalid token", { status: 401 });
      }
      if (url === META_URL) {
        if (init?.method === "PUT")
          return Response.json({ platform_key: "testorg", platform_name: "Twin", metadata: {} });
        return Response.json({ platform_key: "testorg", platform_name: "Twin", metadata: { apps } });
      }
      if (url === LINK_URL) return new Response(null, { status: 201 });
      if (url === CONFIG_URL) return Response.json({ platform_key: "testorg" });
      if (url.includes("/api/core/platform/users/"))
        return Response.json({ results: [{ username: "jane", is_admin: admin }] });
      if (url === PUBLIC_CONFIG_URL)
        return Response.json({ platform_key: "testorg", allow_self_linking: selfJoin });
      return stripe(url, init);
    }),
  );
};

const req = (
  path: string,
  init?: { method?: string; token?: string; json?: unknown; headers?: Record<string, string> },
) => {
  const { token, json, method, headers } = init ?? {};
  return new NextRequest(`http://app.test${path}`, {
    method: method ?? "GET",
    headers: {
      ...(token && { Authorization: `Token ${token}` }),
      ...(json !== undefined && { "Content-Type": "application/json" }),
      ...headers,
    },
    ...(json !== undefined && { body: JSON.stringify(json) }),
  });
};

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.edu";
  process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = "testorg";
  process.env.IBLAI_API_KEY = "platform-key";
  delete process.env.IBLAI_ADMIN_TOKEN;
  process.env.PAYWALL_APP_SLUG = "ibl-twin";
  delete process.env.PAYWALL_PRICE_IDS;
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

describe("GET /api/paywall/prices", () => {
  it("is public and reports what the server can do for a buyer", async () => {
    stubFetch({ apps: { "ibl-twin": monthly() } });
    const { GET } = await loadPrices();
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      app: "ibl-twin",
      appName: "memorare twin",
      serverReady: true,
      paywall: true,
      decided: true,
    });
    expect(body.prices[0].id).toBe("price_1");
    // Two public reads and nothing else: the plan, and the self-join switch.
    expect(dm.every((c) => c.url === META_URL || c.url === PUBLIC_CONFIG_URL)).toBe(true);
  });

  it("with only the admin session token: ready; with nothing published: no paywall yet", async () => {
    delete process.env.IBLAI_API_KEY;
    process.env.IBLAI_ADMIN_TOKEN = "admin-session";
    vi.resetModules();
    stubFetch();
    const { GET } = await loadPrices();
    expect(await (await GET()).json()).toMatchObject({
      serverReady: true,
      paywall: false,
      decided: false,
    });
  });

  it("flags free membership while the platform's self-join switch is open, with the plan as the upgrade", async () => {
    process.env.FREE_VIDEOS_PER_MONTH = "3";
    stubFetch({ apps: { "ibl-twin": monthly() }, selfJoin: true });
    const { GET } = await loadPrices();
    expect(await (await GET()).json()).toMatchObject({ paywall: true, decided: true, free: true, freeVideos: 3 });
    expect((await (await GET()).json()).prices[0].id).toBe("price_1");
  });

  it("with no credential at all: still answers (public), but not ready", async () => {
    delete process.env.IBLAI_API_KEY;
    vi.resetModules();
    stubFetch();
    const { GET } = await loadPrices();
    expect(await (await GET()).json()).toMatchObject({ serverReady: false });
  });
});

describe("POST /api/paywall/checkout", () => {
  /** The Stripe side of a buyer who holds nothing yet. */
  const nothingHeld = (url: string) => {
    if (url.includes("/paywall/payments/")) return Response.json({ count: 0, results: [] });
    if (url.includes("/subscriptions/?")) return Response.json({ data: [] });
    if (url.includes("/checkout-sessions/?")) return Response.json({ data: [] });
    return null;
  };

  it("500s loudly without a platform credential", async () => {
    delete process.env.IBLAI_API_KEY;
    vi.resetModules();
    stubFetch();
    const { POST } = await loadCheckout();
    const res = await POST(req("/api/paywall/checkout", { method: "POST", json: { price_id: "price_1" } }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/IBLAI_API_KEY/);
  });


  it("free membership: a member on the free plan is sold the upgrade like anyone else", async () => {
    stubFetch({
      apps: { "ibl-twin": monthly() },
      selfJoin: true,
      stripe: (url) => {
        const none = nothingHeld(url);
        if (none) return none;
        if (url.includes("/customers/search/")) return Response.json({ data: [{ id: "cus_9" }] });
        if (url.endsWith("/checkout-sessions/")) return Response.json({ id: "cs_up", url: "https://checkout.stripe.com/c/pay/cs_up" });
        return Response.json({});
      },
    });
    const { POST } = await loadCheckout();
    const res = await POST(req("/api/paywall/checkout", { method: "POST", token: "dm-jane", json: {} }));
    expect(await res.json()).toEqual({ checkout_url: "https://checkout.stripe.com/c/pay/cs_up", session_id: "cs_up" });
  });

  it("404s `no_plan` while nothing is published, and refuses an unknown price", async () => {
    stubFetch();
    let { POST } = await loadCheckout();
    let res = await POST(req("/api/paywall/checkout", { method: "POST", token: "dm-jane", json: {} }));
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe("no_plan");

    vi.resetModules();
    stubFetch({ apps: { "ibl-twin": monthly() } });
    ({ POST } = await loadCheckout());
    res = await POST(req("/api/paywall/checkout", { method: "POST", token: "dm-jane", json: { price_id: "price_x" } }));
    expect(res.status).toBe(400);
    expect(dm.some((c) => c.url.includes("/providers/stripe/"))).toBe(false);
  });

  it("mints the checkout for a signed-in buyer on the key owner's path — no price id needed with one plan", async () => {
    stubFetch({
      apps: { "ibl-twin": monthly() },
      stripe: (url) => {
        const none = nothingHeld(url);
        if (none) return none;
        if (url.includes("/customers/search/")) return Response.json({ data: [{ id: "cus_9" }] });
        if (url.endsWith("/checkout-sessions/"))
          return Response.json({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
        return Response.json({});
      },
    });
    const { POST } = await loadCheckout();
    const res = await POST(req("/api/paywall/checkout", { method: "POST", token: "dm-jane", json: {} }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      checkout_url: "https://checkout.stripe.com/c/pay/cs_1",
      session_id: "cs_1",
    });
    const session = dm.find((c) => c.url.endsWith("/checkout-sessions/") && c.method === "POST")!;
    expect(session.url.startsWith(proxyFor("owner"))).toBe(true);
    expect(session.headers.Authorization).toBe("Api-Token platform-key");
    expect(session.body.customer).toBe("cus_9");
    expect(session.body.metadata).toEqual({ ibl_username: "jane", ibl_user_id: "7", app: "ibl-twin" });
    expect(session.body.success_url).toBe("http://app.test/join?session_id={CHECKOUT_SESSION_ID}");
    expect(session.body.cancel_url).toBe("http://app.test/join?canceled=1");
    // The guard ran before anything was minted.
    expect(dm.some((c) => c.url.includes("/subscriptions/?customer=cus_9"))).toBe(true);
  });

  it("answers `already` from the platform's ledger and re-asserts the membership, minting nothing", async () => {
    stubFetch({
      apps: { "ibl-twin": monthly() },
      stripe: (url) => {
        if (url.includes("/paywall/payments/"))
          return Response.json({
            count: 1,
            results: [{ id: 6, username: "jane", mode: "subscription", status: "active", stripe_session_id: "cs_1", stripe_subscription_id: "sub_1", created_at: new Date().toISOString() }],
          });
        if (url.includes("/paywall/access/")) return Response.json({ has_access: true });
        throw new Error(`unexpected ${url}`);
      },
    });
    const { POST } = await loadCheckout();
    const res = await POST(req("/api/paywall/checkout", { method: "POST", token: "dm-jane", json: {} }));
    expect(await res.json()).toEqual({ already: true, source: "ledger" });
    const link = dm.find((c) => c.url === LINK_URL)!;
    expect(link.body).toEqual({ user_id: 7, platform_key: "testorg", active: true });
    expect(dm.some((c) => c.url.endsWith("/checkout-sessions/") && c.method === "POST")).toBe(false);
  });

  it("answers `already` from Stripe (a live subscription the ledger missed) and joins from that session", async () => {
    const paidSession = {
      id: "cs_lost",
      status: "complete",
      mode: "subscription",
      subscription: { id: "sub_1", status: "active" },
      metadata: { ibl_username: "jane", ibl_user_id: "7", app: "ibl-twin" },
    };
    stubFetch({
      apps: { "ibl-twin": monthly() },
      stripe: (url) => {
        if (url.includes("/paywall/payments/")) return Response.json({ count: 0, results: [] });
        if (url.includes("/customers/search/")) return Response.json({ data: [{ id: "cus_9" }] });
        if (url.includes("/subscriptions/?")) return Response.json({ data: [{ id: "sub_1", status: "active" }] });
        if (url.includes("/checkout-sessions/?"))
          return Response.json({ data: [{ id: "cs_lost", status: "complete", mode: "subscription", subscription: "sub_1", metadata: { app: "ibl-twin" } }] });
        if (url.includes("/checkout-sessions/cs_lost/")) return Response.json(paidSession);
        if (url.includes("/paywall/access/")) return Response.json({ ok: true });
        throw new Error(`unexpected ${url}`);
      },
    });
    const { POST } = await loadCheckout();
    const res = await POST(req("/api/paywall/checkout", { method: "POST", token: "dm-jane", json: {} }));
    expect(await res.json()).toEqual({ already: true, source: "stripe:subscription" });
    const link = dm.find((c) => c.url === LINK_URL)!;
    expect(link.body).toEqual({ user_id: 7, platform_key: "testorg", active: true });
    expect(dm.some((c) => c.url.endsWith("/checkout-sessions/") && c.method === "POST")).toBe(false);
  });

  it("never sells the plan to an admin: `already`, nothing minted", async () => {
    stubFetch({ apps: { "ibl-twin": monthly() }, admin: true, stripe: (url) => { throw new Error(`touched ${url}`); } });
    const { POST } = await loadCheckout();
    const res = await POST(req("/api/paywall/checkout", { method: "POST", token: "dm-jane", json: {} }));
    expect(await res.json()).toEqual({ already: true, source: "admin" });
  });

  it("requires a sign-in: the buyer is always the caller", async () => {
    stubFetch({ apps: { "ibl-twin": monthly() }, member: false });
    const { POST } = await loadCheckout();
    const res = await POST(req("/api/paywall/checkout", { method: "POST", json: { email: "a@b.co" } }));
    expect(res.status).toBe(401);
    expect(dm.some((c) => c.url.includes("/providers/stripe/"))).toBe(false);
  });

  it("passes the DM's own refusal through (a publishable Stripe key → 502)", async () => {
    stubFetch({
      apps: { "ibl-twin": monthly() },
      stripe: (url) =>
        nothingHeld(url) ??
        Response.json(
          { error: "Stripe rejected the configured credential", code: "secret_key_required" },
          { status: 502 },
        ),
    });
    const { POST } = await loadCheckout();
    const res = await POST(req("/api/paywall/checkout", { method: "POST", token: "dm-jane", json: {} }));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("secret_key_required");
  });
});

describe("GET /api/paywall/access", () => {
  const paidSession = {
    id: "cs_1",
    status: "complete",
    mode: "subscription",
    subscription: { status: "active" },
    customer_details: { email: "jane@x.io" },
    metadata: { ibl_username: "jane", ibl_user_id: "7", app: "ibl-twin" },
  };

  it("401s a standing check without a sign-in", async () => {
    stubFetch({ member: false });
    const { GET } = await loadAccess();
    expect((await GET(req("/api/paywall/access"))).status).toBe(401);
  });

  it("joins a signed-in buyer back from Stripe only for their own paid session", async () => {
    stubFetch({ stripe: () => Response.json(paidSession) });
    const { GET } = await loadAccess();
    let res = await GET(req("/api/paywall/access?session_id=cs_1", { token: "dm-jane" }));
    expect(await res.json()).toEqual({ joined: true });
    const link = dm.find((c) => c.url === LINK_URL)!;
    expect(link.body).toEqual({ user_id: 7, platform_key: "testorg", active: true });

    stubFetch({
      stripe: () => Response.json({ ...paidSession, metadata: { ...paidSession.metadata, ibl_username: "mallory" } }),
    });
    res = await GET(req("/api/paywall/access?session_id=cs_1", { token: "dm-jane" }));
    expect(res.status).toBe(403);
    expect(dm.some((c) => c.url === LINK_URL)).toBe(false);
  });

  it("401s a checkout return without a sign-in, before touching Stripe", async () => {
    stubFetch({ member: false, stripe: () => Response.json(paidSession) });
    const { GET } = await loadAccess();
    const res = await GET(req("/api/paywall/access?session_id=cs_1"));
    expect(res.status).toBe(401);
    expect(dm.some((c) => c.url.includes("/checkout-sessions/"))).toBe(false);
    expect(dm.some((c) => c.url === LINK_URL)).toBe(false);
  });

  it("never ends a membership while membership is free (a lapse only drops the plan)", async () => {
    stubFetch({ apps: { "ibl-twin": monthly() }, selfJoin: true, stripe: (url) => { throw new Error(`touched ${url}`); } });
    const { GET } = await loadAccess();
    expect(await (await GET(req("/api/paywall/access", { token: "dm-jane" }))).json()).toEqual({
      has_access: true,
      free: true,
    });
    expect(dm.some((c) => c.url === LINK_URL)).toBe(false);
  });

  it("answers has_access true without asking the DM while nothing is for sale", async () => {
    stubFetch();
    const { GET } = await loadAccess();
    const res = await GET(req("/api/paywall/access", { token: "dm-jane" }));
    expect(await res.json()).toEqual({ has_access: true, paywall: false });
    expect(dm.filter((c) => c.url.includes("/providers/stripe/"))).toHaveLength(0);
  });

  const ledgerRow = (over: Record<string, unknown> = {}) => ({
    id: 6,
    username: "jane",
    mode: "subscription",
    status: "active",
    stripe_session_id: "cs_1",
    stripe_subscription_id: "sub_1",
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  });

  it("ends a recorded payer's membership only when Stripe confirms the subscription is dead", async () => {
    stubFetch({
      apps: { "ibl-twin": monthly() },
      stripe: (url) => {
        if (url.includes("/paywall/payments/")) return Response.json({ count: 1, results: [ledgerRow()] });
        if (url.includes("/paywall/access/")) return Response.json({ has_access: false });
        if (url.endsWith("/subscriptions/sub_1/")) return Response.json({ id: "sub_1", status: "canceled" });
        return Response.json({});
      },
    });
    const { GET } = await loadAccess();
    const res = await GET(req("/api/paywall/access", { token: "dm-jane" }));
    expect(await res.json()).toEqual({ has_access: false, payer: true, reason: "subscription canceled" });
    const unlink = dm.find((c) => c.url === LINK_URL)!;
    expect(unlink.body).toEqual({ user_id: 7, platform_key: "testorg", active: false });
    const live = dm.find((c) => c.url.includes("/paywall/access/"))!;
    expect(live.url.startsWith(proxyFor("jane"))).toBe(true);
  });

  it("keeps a payer in when the DM says no but the payment is recent or Stripe disagrees", async () => {
    // Fresh payment: the DM's view can lag the checkout — never questioned.
    stubFetch({
      apps: { "ibl-twin": monthly() },
      stripe: (url) => {
        if (url.includes("/paywall/payments/"))
          return Response.json({ count: 1, results: [ledgerRow({ created_at: new Date().toISOString() })] });
        if (url.includes("/paywall/access/")) return Response.json({ has_access: false });
        throw new Error(`unexpected ${url}`);
      },
    });
    let { GET } = await loadAccess();
    expect(await (await GET(req("/api/paywall/access", { token: "dm-jane" }))).json()).toMatchObject({
      has_access: true,
      payer: true,
      reason: "recent payment",
    });
    expect(dm.some((c) => c.url === LINK_URL)).toBe(false);

    // Old payment, DM says no, but Stripe says the subscription is merely past_due.
    stubFetch({
      apps: { "ibl-twin": monthly() },
      stripe: (url) => {
        if (url.includes("/paywall/payments/")) return Response.json({ count: 1, results: [ledgerRow()] });
        if (url.includes("/paywall/access/")) return Response.json({ has_access: false });
        if (url.endsWith("/subscriptions/sub_1/")) return Response.json({ id: "sub_1", status: "past_due" });
        return Response.json({});
      },
    });
    ({ GET } = await loadAccess());
    expect(await (await GET(req("/api/paywall/access", { token: "dm-jane" }))).json()).toMatchObject({
      has_access: true,
      reason: "subscription past_due",
    });
    expect(dm.some((c) => c.url === LINK_URL)).toBe(false);

    // A one-time payment never lapses, whatever the DM says.
    stubFetch({
      apps: { "ibl-twin": monthly() },
      stripe: (url) => {
        if (url.includes("/paywall/payments/"))
          return Response.json({ count: 1, results: [ledgerRow({ mode: "payment", stripe_subscription_id: null })] });
        throw new Error(`unexpected ${url}`);
      },
    });
    ({ GET } = await loadAccess());
    expect(await (await GET(req("/api/paywall/access", { token: "dm-jane" }))).json()).toMatchObject({
      has_access: true,
      reason: "one-time payment",
    });
  });

  it("re-asserts a live payer's membership on request (ensure=1) — the paywall's 'you already paid' answer", async () => {
    stubFetch({
      apps: { "ibl-twin": monthly() },
      stripe: (url) => {
        if (url.includes("/paywall/payments/")) return Response.json({ count: 1, results: [ledgerRow()] });
        if (url.includes("/paywall/access/")) return Response.json({ has_access: true });
        throw new Error(`unexpected ${url}`);
      },
    });
    const { GET } = await loadAccess();
    const res = await GET(req("/api/paywall/access?ensure=1", { token: "dm-jane" }));
    expect(await res.json()).toEqual({ has_access: true, payer: true, relinked: true, reason: "live" });
    const link = dm.find((c) => c.url === LINK_URL)!;
    expect(link.body).toEqual({ user_id: 7, platform_key: "testorg", active: true });
  });

  it("never checks Stripe for a member who never paid (admins, invitees), and never links them", async () => {
    stubFetch({
      apps: { "ibl-twin": monthly() },
      stripe: (url) => {
        if (url.includes("/paywall/payments/")) return Response.json({ count: 0, results: [] });
        throw new Error(`unexpected ${url}`);
      },
    });
    const { GET } = await loadAccess();
    expect(await (await GET(req("/api/paywall/access?ensure=1", { token: "dm-jane" }))).json()).toEqual({
      has_access: true,
      payer: false,
    });
    expect(dm.some((c) => c.url === LINK_URL)).toBe(false);
  });
});

describe("POST /api/paywall/admin/setup", () => {
  it("401s without a sign-in and 400s a bad answer", async () => {
    stubFetch({ member: false });
    const { POST } = await loadSetup();
    expect((await POST(req("/api/paywall/admin/setup", { method: "POST", json: { access: "free" } }))).status).toBe(401);
    stubFetch();
    expect(
      (await POST(req("/api/paywall/admin/setup", { method: "POST", token: "t", json: { access: "weekly" } })))
        .status,
    ).toBe(400);
    expect(
      (
        await POST(
          req("/api/paywall/admin/setup", { method: "POST", token: "t", json: { access: "monthly", amount: 0 } }),
        )
      ).status,
    ).toBe(400);
  });

  it("refuses the free option: this app never opens self-join", async () => {
    stubFetch({ stripe: (url) => { throw new Error(`Stripe touched: ${url}`); } });
    const { POST } = await loadSetup();
    const res = await POST(
      req("/api/paywall/admin/setup", { method: "POST", token: "dm-admin", json: { access: "free" } }),
    );
    expect(res.status).toBe(400);
    expect(dm.some((c) => c.url === CONFIG_URL)).toBe(false);
    expect(dm.some((c) => c.url === META_URL && c.method === "PUT")).toBe(false);
  });

  it("monthly: archives the old price, creates a tagged product and the price, closes self-join, records", async () => {
    const order: string[] = [];
    stubFetch({
      apps: { "ibl-twin": monthly({ stripe: { product_id: "prod_old", price_id: "price_old" } }) },
      stripe: (url, init) => {
        order.push(`${init?.method ?? "GET"} ${url.split("/payments")[1]}`);
        if (url.endsWith("/products/prod_old/")) return Response.json({ detail: "gone" }, { status: 404 });
        if (url.endsWith("/products/")) return Response.json({ id: "prod_new" });
        if (url.endsWith("/prices/")) return Response.json({ id: "price_new" });
        return Response.json({ id: "price_old", active: false });
      },
    });
    const { POST } = await loadSetup();
    const res = await POST(
      req("/api/paywall/admin/setup", {
        method: "POST",
        token: "dm-admin",
        headers: { "Idempotency-Key": "k1" },
        json: { access: "monthly", amount: 500 },
      }),
    );
    expect(res.status).toBe(200);
    expect(order).toEqual([
      "POST /prices/price_old/",
      "GET /products/prod_old/",
      "POST /products/",
      "POST /prices/",
    ]);
    const product = dm.find((c) => c.url.endsWith("/products/") && c.method === "POST")!;
    expect(product.url.startsWith(proxyFor("jane"))).toBe(true);
    expect(product.headers.Authorization).toBe("Token dm-admin");
    expect(product.headers["Idempotency-Key"]).toBe("k1-product");
    expect(product.body).toEqual({ name: "memorare twin", metadata: { app: "ibl-twin" } });
    const price = dm.find((c) => c.url.endsWith("/prices/") && c.method === "POST")!;
    expect(price.body).toEqual({
      product: "prod_new",
      unit_amount: 500,
      currency: "usd",
      nickname: "Monthly access",
      recurring: { interval: "month" },
    });
    const cfg = dm.find((c) => c.url === CONFIG_URL)!;
    expect(cfg.headers.Authorization).toBe("Token dm-admin");
    expect(cfg.body).toEqual({ platform_key: "testorg", allow_self_linking: false });
    const put = dm.find((c) => c.url === META_URL && c.method === "PUT")!;
    expect(put.headers.Authorization).toBe("Token dm-admin");
    expect(put.body.metadata.apps["ibl-twin"]).toMatchObject({
      access: "monthly",
      amount: 500,
      currency: "usd",
      stripe: { product_id: "prod_new", price_id: "price_new" },
    });
    expect((await res.json()).info.stripe.price_id).toBe("price_new");
  });

  it("adopts a price the owner made in Stripe: tags its product, keeps it, closes self-join, records", async () => {
    const theirs = {
      id: "price_1UDBzF",
      active: true,
      currency: "usd",
      unit_amount: 800,
      recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
      product: { id: "prod_VDdF", active: true, name: "Memorare Twin", metadata: { color: "blue" } },
    };
    const order: string[] = [];
    stubFetch({
      // An app-made price was live before: it is retired, the owner's is not touched.
      apps: { "ibl-twin": monthly({ stripe: { product_id: "prod_old", price_id: "price_old", managed: true } }) },
      stripe: (url, init) => {
        order.push(`${init?.method ?? "GET"} ${url.split("/payments")[1]}`);
        if (url.includes("/prices/price_1UDBzF/")) return Response.json(theirs);
        if (url.endsWith("/products/prod_VDdF/")) return Response.json({ ...theirs.product, metadata: { color: "blue", app: "ibl-twin" } });
        if (url.endsWith("/prices/price_old/")) return Response.json({ id: "price_old", active: false });
        throw new Error(`unexpected ${url}`);
      },
    });
    const { POST } = await loadSetup();
    const res = await POST(
      req("/api/paywall/admin/setup", {
        method: "POST",
        token: "dm-admin",
        headers: { "Idempotency-Key": "k2" },
        json: { price_id: "price_1UDBzF" },
      }),
    );
    expect(res.status).toBe(200);
    expect(order).toEqual([
      "GET /prices/price_1UDBzF/?expand[]=product",
      "POST /products/prod_VDdF/",
      "POST /prices/price_old/",
    ]);
    const tag = dm.find((c) => c.url.endsWith("/products/prod_VDdF/"))!;
    expect(tag.headers.Authorization).toBe("Token dm-admin");
    expect(tag.body).toEqual({ metadata: { color: "blue", app: "ibl-twin" } });
    const cfg = dm.find((c) => c.url === CONFIG_URL)!;
    expect(cfg.body).toEqual({ platform_key: "testorg", allow_self_linking: false });
    const put = dm.find((c) => c.url === META_URL && c.method === "PUT")!;
    expect(put.body.metadata.apps["ibl-twin"]).toMatchObject({
      access: "monthly",
      amount: 800,
      currency: "usd",
      name: "Memorare Twin",
      stripe: { product_id: "prod_VDdF", price_id: "price_1UDBzF", managed: false },
    });
    // No Stripe objects were created.
    expect(dm.some((c) => (c.url.endsWith("/products/") || c.url.endsWith("/prices/")) && c.method === "POST")).toBe(false);
  });

  it("refuses an adopted price this app cannot sell (yearly, not USD, archived) before writing anything", async () => {
    const base = { id: "p", active: true, currency: "usd", unit_amount: 100, product: { id: "pr", active: true, name: "X", metadata: {} } };
    for (const price of [
      { ...base, recurring: { interval: "year", interval_count: 1 } },
      { ...base, currency: "eur" },
      { ...base, active: false },
    ]) {
      stubFetch({ stripe: () => Response.json(price) });
      const { POST } = await loadSetup();
      const res = await POST(
        req("/api/paywall/admin/setup", { method: "POST", token: "dm-admin", json: { price_id: "p" } }),
      );
      expect(res.status).toBe(400);
      expect(dm.some((c) => c.url === META_URL && c.method === "PUT")).toBe(false);
      expect(dm.some((c) => c.url === CONFIG_URL)).toBe(false);
    }
  });

  it("never archives a price the owner made when switching to a new app-made one", async () => {
    stubFetch({
      apps: { "ibl-twin": monthly({ stripe: { product_id: "prod_theirs", price_id: "price_theirs", managed: false } }) },
      stripe: (url) => {
        if (url.endsWith("/prices/price_theirs/")) throw new Error("archived the owner's price");
        if (url.endsWith("/products/")) return Response.json({ id: "prod_new" });
        if (url.endsWith("/prices/")) return Response.json({ id: "price_new" });
        return Response.json({});
      },
    });
    const { POST } = await loadSetup();
    const res = await POST(
      req("/api/paywall/admin/setup", { method: "POST", token: "dm-admin", json: { access: "one_time", amount: 1500 } }),
    );
    expect(res.status).toBe(200);
    const put = dm.find((c) => c.url === META_URL && c.method === "PUT")!;
    expect(put.body.metadata.apps["ibl-twin"]).toMatchObject({
      access: "one_time",
      amount: 1500,
      stripe: { product_id: "prod_new", price_id: "price_new", managed: true },
    });
  });

  it("stops at Stripe's refusal (publishable key) and records nothing", async () => {
    stubFetch({
      stripe: () =>
        Response.json(
          { error: "Stripe rejected the configured credential", code: "secret_key_required" },
          { status: 502 },
        ),
    });
    const { POST } = await loadSetup();
    const res = await POST(
      req("/api/paywall/admin/setup", { method: "POST", token: "dm-admin", json: { access: "monthly", amount: 500 } }),
    );
    expect(res.status).toBe(502);
    expect(dm.some((c) => c.url === META_URL && c.method === "PUT")).toBe(false);
    expect(dm.some((c) => c.url === CONFIG_URL)).toBe(false);
  });
});

describe("GET /api/paywall/admin/prices", () => {
  it("lists the owner's active Stripe prices with the admin's own token and says which are sellable", async () => {
    stubFetch({
      stripe: (url) => {
        expect(url).toContain("/prices/?active=true&limit=100&expand%5B%5D=data.product");
        return Response.json({
          data: [
            { id: "p_month", active: true, currency: "usd", unit_amount: 800, created: 3, recurring: { interval: "month", interval_count: 1 }, product: { id: "pr1", active: true, name: "Memorare Twin" } },
            { id: "p_once", active: true, currency: "usd", unit_amount: 1500, created: 2, product: { id: "pr2", active: true, name: "Lifetime" } },
            { id: "p_year", active: true, currency: "usd", unit_amount: 9000, created: 1, recurring: { interval: "year", interval_count: 1 }, product: { id: "pr3", active: true, name: "Yearly" } },
            { id: "p_eur", active: true, currency: "eur", unit_amount: 800, created: 4, recurring: { interval: "month", interval_count: 1 }, product: { id: "pr4", active: true, name: "EU" } },
            { id: "p_dead", active: true, currency: "usd", unit_amount: 100, created: 5, product: { id: "pr5", active: false, name: "Gone" } },
          ],
        });
      },
    });
    const { GET } = await loadAdminPrices();
    const res = await GET(req("/api/paywall/admin/prices", { token: "dm-admin" }));
    expect(res.status).toBe(200);
    const { prices } = await res.json();
    expect(prices.map((p: any) => [p.id, p.sellable, p.access])).toEqual([
      ["p_eur", false, "monthly"],
      ["p_month", true, "monthly"],
      ["p_once", true, "one_time"],
      ["p_year", false, null],
    ]);
    expect(prices[1]).toMatchObject({ name: "Memorare Twin", unitAmount: 800, interval: "month", productId: "pr1" });
    const call = dm.find((c) => c.url.includes("/prices/?"))!;
    expect(call.headers.Authorization).toBe("Token dm-admin");
    expect(call.url.startsWith(proxyFor("jane"))).toBe(true);
  });

  it("401s without a sign-in and passes the DM's refusal through", async () => {
    stubFetch({ member: false });
    const { GET } = await loadAdminPrices();
    expect((await GET(req("/api/paywall/admin/prices"))).status).toBe(401);
    stubFetch({ stripe: () => Response.json({ error: "no stripe credential" }, { status: 400 }) });
    expect((await GET(req("/api/paywall/admin/prices", { token: "dm-jane" }))).status).toBe(400);
  });
});
