import { afterEach, describe, expect, it, vi } from "vitest";

import {
  classifyAuthFailure,
  fetchPlatformAccessConfig,
  isNoticeCode,
  loginNoticeUrl,
} from "@/lib/iblai/access";

describe("classifyAuthFailure", () => {
  it("maps the tenant membership refusal to no_access", () => {
    expect(
      classifyAuthFailure(
        "You do not have access to this platform (d0d3b083). Please contact your administrator.",
      ),
    ).toBe("no_access");
  });

  it("maps the post-re-auth membership failure to no_access", () => {
    expect(
      classifyAuthFailure("User still does not belong to tenant after re-auth: d0d3b083"),
    ).toBe("no_access");
  });

  it("maps token expiry to session_expired", () => {
    expect(classifyAuthFailure("Auth token expired")).toBe("session_expired");
    expect(classifyAuthFailure("DM token expired")).toBe("session_expired");
  });

  it("keeps a foreign-workspace switch distinct from a plain refusal", () => {
    // set directly by handleTenantSwitch, never parsed from an SDK string
    expect(isNoticeCode("other_workspace")).toBe(true);
    expect(loginNoticeUrl("other_workspace", "fayyaz@ibleducation.com")).toBe(
      "/login?notice=other_workspace&email=fayyaz%40ibleducation.com",
    );
  });

  it("falls back to error for anything else", () => {
    expect(classifyAuthFailure("Unexpected error: boom")).toBe("error");
    expect(classifyAuthFailure("")).toBe("error");
  });
});

describe("isNoticeCode", () => {
  it("accepts only known codes", () => {
    expect(isNoticeCode("no_access")).toBe(true);
    expect(isNoticeCode("other_workspace")).toBe(true);
    expect(isNoticeCode("session_expired")).toBe(true);
    expect(isNoticeCode("error")).toBe(true);
    expect(isNoticeCode("<script>")).toBe(false);
    expect(isNoticeCode(null)).toBe(false);
  });
});

describe("loginNoticeUrl", () => {
  it("encodes the email so it survives the round trip", () => {
    expect(loginNoticeUrl("no_access", "a+b@example.com")).toBe(
      "/login?notice=no_access&email=a%2Bb%40example.com",
    );
  });

  it("omits the email when there is none", () => {
    expect(loginNoticeUrl("session_expired")).toBe("/login?notice=session_expired");
  });
});

describe("fetchPlatformAccessConfig", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports invite-only when self linking is off", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ platform_key: "t", allow_self_linking: false }),
      }),
    );
    expect(await fetchPlatformAccessConfig("https://api.iblai.app/dm", "t")).toEqual({
      allowSelfLinking: false,
    });
  });

  it("reports open when self linking is on", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ allow_self_linking: true }),
      }),
    );
    expect(await fetchPlatformAccessConfig("https://api.iblai.app/dm", "t")).toEqual({
      allowSelfLinking: true,
    });
  });

  it("returns null instead of throwing when the endpoint fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await fetchPlatformAccessConfig("https://api.iblai.app/dm", "t")).toBeNull();
  });

  it("does not call the network without a tenant", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await fetchPlatformAccessConfig("https://api.iblai.app/dm", "")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });
});
