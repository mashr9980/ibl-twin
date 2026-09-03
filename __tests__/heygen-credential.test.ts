import { describe, expect, it } from "vitest";

import { extractApiKey } from "@/lib/heygen/credential";

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
