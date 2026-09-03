/**
 * The ai-account integration-credential endpoint has no single documented
 * envelope — it may return a bare object, a list of {name, value} entries, or
 * a paginated {results: […]} wrapper. Rather than guess one shape, walk the
 * structure and take the first plausible non-empty key.
 *
 * Kept pure and separate from the route handler so it can be tested directly.
 */
const KEY_NAMES = ["key", "api_key", "apiKey", "token", "secret"] as const;
const MAX_DEPTH = 6;

/**
 * A string only counts as the credential when it was found *under a
 * recognised key name*. Accepting bare strings encountered while walking is
 * how an entry like {name: "heygen", value: {key: "…"}} yields "heygen" — the
 * label rather than the secret — which upstream then rejects with a 401 that
 * looks nothing like the actual cause.
 */
export function extractApiKey(node: unknown, depth = 0): string | null {
  if (depth > MAX_DEPTH || node == null) return null;

  // Only meaningful at the root: the endpoint returned the key by itself.
  if (typeof node === "string") {
    return depth === 0 && node.trim() ? node : null;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = extractApiKey(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;

    // Named lookup first — this is the only place a string is trusted.
    for (const name of KEY_NAMES) {
      const v = obj[name];
      if (typeof v === "string" && v.trim()) return v;
    }

    // Then descend, but only into containers.
    for (const v of Object.values(obj)) {
      if (v !== null && typeof v === "object") {
        const hit = extractApiKey(v, depth + 1);
        if (hit) return hit;
      }
    }
  }

  return null;
}
