import "./helpers/browser-stub";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Tenant resolution and the membership helpers.

const KEY = "d0d3b083f95446a59ed6e0a73396ab01";
let savedKey: string | undefined;

beforeEach(() => {
  savedKey = process.env.NEXT_PUBLIC_MAIN_TENANT_KEY;
  process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = KEY;
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  if (savedKey === undefined) delete process.env.NEXT_PUBLIC_MAIN_TENANT_KEY;
  else process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = savedKey;
});

const load = async () => await import("@/lib/iblai/tenant");

describe("resolveAppTenant", () => {
  it("env wins over whatever a previous run left in localStorage", async () => {
    localStorage.setItem("app_tenant", "stale-tenant");
    localStorage.setItem("tenant", "main");
    const { resolveAppTenant } = await load();
    expect(resolveAppTenant()).toBe(KEY);
    expect(localStorage.getItem("app_tenant")).toBe(KEY);
  });

  it("placeholders (including `main`) resolve to nothing", async () => {
    process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = "main";
    const { resolveAppTenant } = await load();
    expect(resolveAppTenant()).toBe("");
  });
});

describe("membership helpers", () => {
  it("reads the tenants list, membership and admin flag the sign-in stored", async () => {
    localStorage.setItem(
      "tenants",
      JSON.stringify([
        { key: KEY, is_admin: true },
        { key: "main", is_admin: false },
      ]),
    );
    const { readTenants, isTenantMember, isTenantAdmin, dropTenant } = await load();
    expect(readTenants()).toHaveLength(2);
    expect(isTenantMember(readTenants(), KEY)).toBe(true);
    expect(isTenantMember(readTenants(), "other")).toBe(false);
    expect(isTenantMember(readTenants(), "")).toBe(false);
    expect(isTenantAdmin()).toBe(true);
    dropTenant(KEY);
    expect(isTenantMember(readTenants(), KEY)).toBe(false);
    expect(isTenantAdmin()).toBe(false);
  });

  it("survives garbage in localStorage", async () => {
    localStorage.setItem("tenants", "{not json");
    const { readTenants } = await load();
    expect(readTenants()).toEqual([]);
  });
});

describe("paywallEntry", () => {
  it("sends every signed-in non-member to the paywall, members nowhere", async () => {
    const { paywallEntry, PAYWALL_PATH } = await load();
    expect(paywallEntry({ member: false })).toBe(PAYWALL_PATH);
    expect(paywallEntry({ member: true })).toBeNull();
  });
});

describe("checkTenantMismatch", () => {
  it("re-pins the tenant and sends a non-member elsewhere's session to the paywall", async () => {
    localStorage.setItem("tenant", "someone-elses");
    localStorage.setItem("tenants", JSON.stringify([{ key: "someone-elses" }]));
    const { checkTenantMismatch, PAYWALL_PATH } = await load();
    const replace = vi.fn();
    (globalThis as any).window.location.replace = replace;
    expect(checkTenantMismatch()).toBe(true);
    expect(localStorage.getItem("tenant")).toBe(KEY);
    expect(replace).toHaveBeenCalledWith(PAYWALL_PATH);
  });

  it("is quiet when the stray tenant's session is a member here too", async () => {
    localStorage.setItem("tenant", "someone-elses");
    localStorage.setItem("tenants", JSON.stringify([{ key: "someone-elses" }, { key: KEY }]));
    const { checkTenantMismatch } = await load();
    const replace = vi.fn();
    (globalThis as any).window.location.replace = replace;
    expect(checkTenantMismatch()).toBe(false);
    expect(localStorage.getItem("tenant")).toBe(KEY);
    expect(replace).not.toHaveBeenCalled();
  });
});
