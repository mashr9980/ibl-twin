import { describe, expect, it } from "vitest";

import { creditsFromQuota, extractApiKey, isInsufficientCredit } from "@/lib/heygen/credential";

/**
 * The ai-account credential endpoint has no single documented envelope —
 * iblai/video's own comment says it "may wrap the credential in any of
 * several envelopes". These cover the shapes we know plus the failure
 * modes that must NOT be mistaken for a key.
 */
describe("extractApiKey", () => {
  it("reads the documented list envelope", () => {
    expect(
      extractApiKey([{ name: "heygen", value: { key: "hg-abc123" } }]),
    ).toBe("hg-abc123");
  });

  it("reads a bare object", () => {
    expect(extractApiKey({ api_key: "hg-xyz" })).toBe("hg-xyz");
  });

  it("reads a deeply nested value", () => {
    expect(
      extractApiKey({ results: [{ credential: { value: { key: "hg-deep" } } }] }),
    ).toBe("hg-deep");
  });

  it("accepts the camelCase and token spellings", () => {
    expect(extractApiKey({ apiKey: "hg-camel" })).toBe("hg-camel");
    expect(extractApiKey({ token: "hg-token" })).toBe("hg-token");
  });

  it("returns null when the tenant has no credential", () => {
    expect(extractApiKey([])).toBeNull();
    expect(extractApiKey({})).toBeNull();
    expect(extractApiKey(null)).toBeNull();
    expect(extractApiKey(undefined)).toBeNull();
  });

  it("does not mistake an empty or whitespace key for a real one", () => {
    expect(extractApiKey([{ name: "heygen", value: { key: "" } }])).toBeNull();
    expect(extractApiKey({ key: "   " })).toBeNull();
  });

  it("stops recursing instead of hanging on a very deep structure", () => {
    let deep: unknown = { key: "hg-too-deep" };
    for (let i = 0; i < 20; i++) deep = { nested: deep };
    expect(extractApiKey(deep)).toBeNull();
  });
});

import { isUsableKey, looksMasked } from "@/lib/heygen/credential";

/**
 * The platform masks sensitive fields for every caller, admins included.
 * Forwarding a masked string upstream yields a bare 401 that looks nothing
 * like its cause, so these guard the detection directly.
 */
describe("masked credential detection", () => {
  const REAL = ["sk", "test", "x".repeat(40)].join("_"); // synthetic, not a real prefix
  const MASKED = "sk_" + "*".repeat(49) + "WJ";

  it("spots the platform's masking format", () => {
    expect(looksMasked(MASKED)).toBe(true);
    expect(looksMasked("sk-****")).toBe(true);
    expect(looksMasked("abc…xyz")).toBe(true);
  });

  it("does not flag a real key", () => {
    expect(looksMasked(REAL)).toBe(false);
  });

  it("accepts only keys that are real, present and long enough", () => {
    expect(isUsableKey(REAL)).toBe(true);
    expect(isUsableKey(MASKED)).toBe(false);
    expect(isUsableKey("")).toBe(false);
    expect(isUsableKey("   ")).toBe(false);
    expect(isUsableKey("short")).toBe(false);
    expect(isUsableKey(null)).toBe(false);
    expect(isUsableKey(undefined)).toBe(false);
  });
});

describe("creditsFromQuota", () => {
  it("converts HeyGen's sixtieths to credits (one decimal) and flags under three as low", () => {
    expect(creditsFromQuota(358)).toEqual({ remaining: 6, low: false });
    expect(creditsFromQuota(180)).toEqual({ remaining: 3, low: false });
    expect(creditsFromQuota(118)).toEqual({ remaining: 2, low: true });
    expect(creditsFromQuota(108)).toEqual({ remaining: 1.8, low: true });
    expect(creditsFromQuota(58)).toEqual({ remaining: 1, low: true });
    expect(creditsFromQuota(0)).toEqual({ remaining: 0, low: true });
  });

  it("is null when the balance could not be read", () => {
    expect(creditsFromQuota(null)).toBeNull();
    expect(creditsFromQuota(undefined)).toBeNull();
    expect(creditsFromQuota(Number.NaN)).toBeNull();
  });
});

describe("isInsufficientCredit", () => {
  it("recognises the unlimited-mode fallback as a credits refusal", () => {
    expect(
      isInsufficientCredit('{"data": null, "error": {"code": "internal_error", "message": "This avatar does not support unlimited mode. Please use a different avatar, or use Avatar IV or Avatar V."}}'),
    ).toBe(true);
  });
  it("recognises HeyGen's exhausted-balance answer and nothing else", () => {
    expect(
      isInsufficientCredit('{"error": {"code": "insufficient_credit", "message": "Insufficient credit."}}'),
    ).toBe(true);
    expect(isInsufficientCredit('{"error": {"code": "invalid_image"}}')).toBe(false);
    expect(isInsufficientCredit("")).toBe(false);
  });
});
