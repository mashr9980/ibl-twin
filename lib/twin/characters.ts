import type { HeygenAvatar } from "@/lib/heygen/rest";

/**
 * Words HeyGen appends to describe a look rather than the person, so a name
 * stops being a name at the first one of these.
 */
const LOOK_WORDS = new Set([
  "in", "with", "at", "on", "the",
  "office", "sofa", "biztalk", "business", "outdoor", "indoor",
  "sitting", "standing", "front", "side", "expressive", "casual",
  "formal", "upper", "lower", "looking", "speaking", "intense",
]);

/**
 * Splitting only on brackets or a spaced dash left 1,199 near-duplicate
 * cards; stopping at the first look word gives 292 characters, 256 with more
 * than one look.
 */
export function characterOf(name: string): string {
  const base = name.split(/\s*\(|\s+-\s+/)[0].trim() || name;
  const tokens = base.split(/\s+/);
  const kept: string[] = [];
  for (const [i, token] of tokens.entries()) {
    if (i && (LOOK_WORDS.has(token.toLowerCase()) || /^[a-z]/.test(token))) break;
    kept.push(token);
    if (i >= 1) break;
  }
  return kept.join(" ") || base;
}
/** "Annie in Grey Jacket" → "in Grey Jacket"; falls back to a bracketed suffix. */
export function lookOf(name: string): string {
  const bracket = name.match(/\(([^)]+)\)/);
  if (bracket) return bracket[1].trim();
  const rest = name.slice(characterOf(name).length).trim();
  return rest || "Default";
}

export interface Character {
  name: string;
  looks: HeygenAvatar[];
}

/** Group a flat avatar list into characters, preserving catalogue order. */
export function groupCharacters(avatars: HeygenAvatar[]): Character[] {
  const map = new Map<string, Character>();
  for (const a of avatars) {
    const key = characterOf(a.avatar_name ?? "");
    const found = map.get(key);
    if (found) found.looks.push(a);
    else map.set(key, { name: key, looks: [a] });
  }
  return [...map.values()];
}
