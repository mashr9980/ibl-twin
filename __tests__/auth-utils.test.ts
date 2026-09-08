import "./helpers/browser-stub";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The hand-off to the Auth SPA and the post-login landing path.

const KEY = "d0d3b083f95446a59ed6e0a73396ab01";
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved.key = process.env.NEXT_PUBLIC_MAIN_TENANT_KEY;
  saved.auth = process.env.NEXT_PUBLIC_AUTH_URL;
  process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = KEY;
  process.env.NEXT_PUBLIC_AUTH_URL = "https://login.iblai.app";
  localStorage.clear();
  vi.resetModules();
});

afterEach(() => {
  if (saved.key === undefined) delete process.env.NEXT_PUBLIC_MAIN_TENANT_KEY;
  else process.env.NEXT_PUBLIC_MAIN_TENANT_KEY = saved.key;
  if (saved.auth === undefined) delete process.env.NEXT_PUBLIC_AUTH_URL;
  else process.env.NEXT_PUBLIC_AUTH_URL = saved.auth;
});

const load = async () => await import("@/lib/iblai/auth-utils");

describe("return path", () => {
  it("never lands a signed-in user back on the sign-in screen", async () => {
    const { saveReturnPath, readReturnPath } = await load();
    saveReturnPath("/join");
    expect(readReturnPath()).toBe("/");
    saveReturnPath("/login?join=1");
    expect(readReturnPath()).toBe("/");
    saveReturnPath("/join?canceled=1");
    expect(readReturnPath()).toBe("/");
    saveReturnPath("/sso-login-complete?data=x");
    expect(readReturnPath()).toBe("/");
    saveReturnPath("/videos/my?type=twin");
    expect(readReturnPath()).toBe("/videos/my?type=twin");
    expect(localStorage.getItem("redirectTo")).toBe("/videos/my?type=twin");
  });
});

describe("Auth SPA URLs", () => {
  it("builds the login URL with app, redirect-to and tenant (email optional)", async () => {
    const { authLoginUrl, authSignupUrl } = await load();
    expect(authLoginUrl("http://localhost:3000", KEY)).toBe(
      `https://login.iblai.app/login?app=custom&redirect-to=http://localhost:3000&tenant=${KEY}`,
    );
    expect(authLoginUrl("http://localhost:3000", KEY, "a+b@x.io")).toContain("&email=a%2Bb%40x.io");
    expect(authSignupUrl("http://localhost:3000")).toBe(
      "https://login.iblai.app/signup?app=custom&redirect-to=http://localhost:3000",
    );
  });
});

describe("token checks", () => {
  it("a DM token counts while unexpired (or undated)", async () => {
    const { hasLiveDmToken } = await load();
    expect(hasLiveDmToken()).toBe(false);
    localStorage.setItem("dm_token", "d");
    expect(hasLiveDmToken()).toBe(true);
    localStorage.setItem("dm_token_expires", "2000-01-01T00:00:00Z");
    expect(hasLiveDmToken()).toBe(false);
    localStorage.setItem("dm_token_expires", "2999-01-01T00:00:00Z");
    expect(hasLiveDmToken()).toBe(true);
  });
});
