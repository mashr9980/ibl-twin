import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * The free plan: every member gets FREE_VIDEOS_PER_MONTH generations, counted
 * per user per UTC month on the server; admins and paying members are
 * unlimited. The HeyGen proxy refuses a free member past the allowance with
 * 402 `free_limit` before anything reaches HeyGen, counts a generation only
 * once HeyGen accepted it, and never meters uploads or reads.
 */

const ENV_KEYS = [
  "NEXT_PUBLIC_API_BASE_URL",
  "NEXT_PUBLIC_MAIN_TENANT_KEY",
  "IBLAI_API_KEY",
  "PAYWALL_APP_SLUG",
  "HEYGEN_API_KEY",
  "FREE_VIDEOS_PER_MONTH",
  "USAGE_STORE_FILE",
] as const;
const saved: Record<string, string | undefined> = {};
let dir = "";


type Rec = { url: string; method: string; headers: Record<string, string> };
let calls: Rec[] = [];

const stubFetch = ({
  admin = false,
  payer = false,
  heygen = () => Response.json({ data: { video_id: "v1" } }),
}: {
  admin?: boolean;
  payer?: boolean;
  heygen?: (url: string) => Response;
} = {}) => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ url, method: init?.method ?? "GET", headers });
      if (url.includes("/api/core/token/verify/")) {
        if (headers.Authorization?.startsWith("Api-Token "))
          return Response.json({ user_id: 1, username: "owner", email: "owner@x.io" });
        return Response.json({ user_id: 7, username: "jane", email: "jane@x.io" });
      }
      if (url.includes("/api/core/platform/users/"))
        return Response.json({ results: [{ username: "jane", is_admin: admin }] });
      if (url.includes("/paywall/payments/"))
        return Response.json(
          payer
            ? { count: 1, results: [{ id: 1, username: "jane", mode: "subscription", status: "active", stripe_session_id: "cs", stripe_subscription_id: "sub", created_at: new Date().toISOString() }] }
            : { count: 0, results: [] },
        );
      if (url.includes("/paywall/access/")) return Response.json({ has_access: true });
      if (url.includes("/platforms/config/public/")) return Response.json({ allow_self_linking: true });
      if (url.includes("/orgs/testorg/metadata/")) return Response.json({ platform_key: "testorg", metadata: {} });
      if (url.startsWith("https://api.heygen.com") || url.startsWith("https://upload.heygen.com")) return heygen(url);
      throw new Error(`unexpected ${url}`);
    }),
  );
};

const loadProxy = async () => await import("@/app/api/heygen/[...path]/route");
const loadUsage = async () => await import("@/app/api/paywall/usage/route");
const loadStore = async () => await import("@/lib/usage-store");
const loadEntitlement = async () => await import("@/lib/entitlement");

const proxyReq = (method: string, rel: string) =>
  new NextRequest(`http://app.test/api/heygen/${rel}`, {
    method,
    headers: { Authorization: "Token dm-jane", "X-Platform": "testorg", "Content-Type": "application/json" },
    ...(method === "POST" && { body: "{}" }),
  });
const ctx = (rel: string) => ({ params: Promise.resolve({ path: rel.split("/") }) });

beforeEach(() => {
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  dir = mkdtempSync(path.join(tmpdir(), "twin-usage-"));
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.edu";
  process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = "testorg";
  process.env.IBLAI_API_KEY = "platform-key";
  process.env.PAYWALL_APP_SLUG = "ibl-twin";
  process.env.HEYGEN_API_KEY = "hg_" + "x".repeat(30);
  process.env.FREE_VIDEOS_PER_MONTH = "2";
  process.env.USAGE_STORE_FILE = path.join(dir, "usage.json");
  vi.resetModules();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllGlobals();
});

describe("usage store", () => {
  it("counts per user per UTC month and starts every month at zero", async () => {
    const { getUsage, incrementUsage, currentPeriod, periodEnd } = await loadStore();
    expect(await getUsage("jane", "2026-09")).toEqual({ used: 0, period: "2026-09" });
    expect(await incrementUsage("jane", "2026-09")).toBe(1);
    expect(await incrementUsage("jane", "2026-09")).toBe(2);
    expect(await incrementUsage("bob", "2026-09")).toBe(1);
    expect(await getUsage("jane", "2026-10")).toEqual({ used: 0, period: "2026-10" });
    expect(currentPeriod(new Date("2026-09-08T23:59:00Z"))).toBe("2026-09");
    expect(periodEnd(new Date("2026-09-08T23:59:00Z")).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
});

describe("entitlement", () => {
  it("admins and paying members are unlimited; everyone else is on the free plan", async () => {
    const { allowanceFor, freeVideosPerMonth } = await loadEntitlement();
    expect(freeVideosPerMonth()).toBe(2);
    const jane = { userId: 7, username: "jane", email: "jane@x.io" };
    stubFetch({ admin: true });
    expect((await allowanceFor(jane)).tier).toBe("admin");
    vi.resetModules();
    stubFetch({ payer: true });
    expect((await (await loadEntitlement()).allowanceFor(jane)).tier).toBe("plus");
    vi.resetModules();
    stubFetch();
    expect(await (await loadEntitlement()).allowanceFor(jane)).toMatchObject({ tier: "free", used: 0, limit: 2, remaining: 2 });
  });

  it("falls back to three free videos when the env is unset or garbage", async () => {
    delete process.env.FREE_VIDEOS_PER_MONTH;
    let { freeVideosPerMonth } = await loadEntitlement();
    expect(freeVideosPerMonth()).toBe(3);
    process.env.FREE_VIDEOS_PER_MONTH = "lots";
    vi.resetModules();
    ({ freeVideosPerMonth } = await loadEntitlement());
    expect(freeVideosPerMonth()).toBe(3);
  });
});

describe("HeyGen proxy metering", () => {
  it("lets a free member generate up to the allowance, counts on success, then refuses with 402 before HeyGen", async () => {
    stubFetch();
    const { POST, isGeneration } = await loadProxy();
    expect(isGeneration("POST", "v2/video/generate")).toBe(true);
    expect(isGeneration("POST", "v3/videos")).toBe(true);
    expect(isGeneration("POST", "v2/photo_avatar/train")).toBe(false);
    expect(isGeneration("POST", "v1/asset")).toBe(false);
    expect(isGeneration("GET", "v2/video/generate")).toBe(false);

    expect((await POST(proxyReq("POST", "v2/video/generate"), ctx("v2/video/generate"))).status).toBe(200);
    expect((await POST(proxyReq("POST", "v3/videos"), ctx("v3/videos"))).status).toBe(200);
    const heygenCalls = () => calls.filter((c) => c.url.startsWith("https://api.heygen.com")).length;
    const before = heygenCalls();
    const refused = await POST(proxyReq("POST", "v2/video/generate"), ctx("v2/video/generate"));
    expect(refused.status).toBe(402);
    expect(await refused.json()).toMatchObject({ code: "free_limit", used: 2, limit: 2 });
    expect(heygenCalls()).toBe(before);

    // Uploads are never metered, even past the allowance.
    expect((await POST(proxyReq("POST", "v1/asset"), ctx("v1/asset"))).status).toBe(200);
  });

  it("does not count a generation HeyGen rejected", async () => {
    stubFetch({ heygen: () => Response.json({ error: { code: "insufficient_credit" } }, { status: 400 }) });
    const { POST } = await loadProxy();
    expect((await POST(proxyReq("POST", "v2/video/generate"), ctx("v2/video/generate"))).status).toBe(400);
    const { getUsage } = await loadStore();
    expect((await getUsage("jane")).used).toBe(0);
  });

  it("never meters admins or paying members", async () => {
    for (const who of [{ admin: true }, { payer: true }]) {
      vi.resetModules();
      stubFetch(who);
      const { POST } = await loadProxy();
      for (let i = 0; i < 3; i++)
        expect((await POST(proxyReq("POST", "v2/video/generate"), ctx("v2/video/generate"))).status).toBe(200);
      const { getUsage } = await loadStore();
      expect((await getUsage("jane")).used).toBe(0);
    }
  });
});

describe("GET /api/paywall/usage", () => {
  it("tells the signed-in member where they stand this month", async () => {
    stubFetch();
    const { incrementUsage } = await loadStore();
    await incrementUsage("jane");
    const { GET } = await loadUsage();
    const res = await GET(new NextRequest("http://app.test/api/paywall/usage", { headers: { Authorization: "Token dm-jane" } }));
    expect(await res.json()).toMatchObject({ tier: "free", used: 1, limit: 2, remaining: 1 });
    expect((await GET(new NextRequest("http://app.test/api/paywall/usage"))).status).toBe(401);
  });
});
