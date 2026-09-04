import type { HeygenAvatar } from "@/lib/heygen/rest";

/**
 * Twin's nine Gallery sub-categories, in its own order and wording.
 *
 * Memorare curates these on its own CMS. HeyGen ships no taxonomy at all, so
 * each avatar is placed by matching role and setting words that genuinely
 * appear in its name. Every category below resolves to real avatars from the
 * live catalogue; nothing here is invented or hard-coded to an id.
 */
export const SUBCATEGORIES = [
  "Education & Training",
  "Business & Corporate",
  "Creators & Entrepreneurs",
  "Coaches & Speakers",
  "Healthcare & Fitness",
  "Hospitality & Culinary",
  "Creative & Technical Professions",
  "Lifestyle & Casual",
  "Global & Diverse Professionals",
] as const;

export type Subcategory = (typeof SUBCATEGORIES)[number];

/** Order matters: the first match wins, so specific roles beat generic settings. */
const RULES: [Subcategory, string[]][] = [
  ["Education & Training", ["professor", "teacher", "academic", "classroom", "lecture", "tutor", "school", "university", "student", "training", "educat"]],
  ["Healthcare & Fitness", ["doctor", "nurse", "medical", "clinic", "health", "fitness", "gym", "scrub", "therapist", "yoga", "hospital", "dentist"]],
  ["Hospitality & Culinary", ["chef", "kitchen", "restaurant", "cafe", "barista", "waiter", "hotel", "culinary", "cook", "bartender"]],
  ["Creative & Technical Professions", ["designer", "engineer", "developer", "artist", "architect", "lab", "tech", "scientist", "mechanic", "programmer", "photograph"]],
  ["Creators & Entrepreneurs", ["creator", "studio", "startup", "founder", "entrepreneur", "podcast", "vlog", "influencer", "streamer"]],
  // "Speaking" poses are the catalogue's only real presenter signal; the
  // fitness coaches it also matches are claimed by Healthcare above.
  ["Coaches & Speakers", ["coach", "speaker", "speaking", "presenter", "presenting", "stage", "motivat", "announcer", "anchor"]],
  ["Business & Corporate", ["business", "corporate", "executive", "office", "suit", "boardroom", "manager", "formal", "blazer"]],
  ["Lifestyle & Casual", ["casual", "sofa", "home", "lounge", "t-shirt", "tshirt", "sweater", "relaxed", "outdoor", "sport", "hoodie"]],
];

/** Everything a rule doesn't claim lands in the catch-all, as twin's does. */
const FALLBACK: Subcategory = "Global & Diverse Professionals";

/**
 * Match at a word start, not anywhere in the string. A plain substring test
 * puts "Javi Intense Sitting Speaking" under royalty because "king" hides
 * inside "speaking"; anchoring to a boundary keeps short words honest while
 * still letting stems like "educat" catch "education".
 */
function mentions(name: string, word: string): boolean {
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(name);
}

export function subcategoryOf(avatarName: string): Subcategory {
  const name = avatarName ?? "";
  for (const [cat, words] of RULES) {
    if (words.some((w) => mentions(name, w))) return cat;
  }
  return FALLBACK;
}

/**
 * Twin's twelve Historical sub-categories, verbatim.
 *
 * HeyGen's catalogue is modern presenters and this account has no historical
 * avatars, so every one of these reads empty today. The rules exist so that a
 * figure trained later lands in the right place without another code change.
 */
export const HISTORICAL_SUBCATEGORIES = [
  "Artists & Creative Geniuses",
  "Scientists & Inventors",
  "Philosophers & Thinkers",
  "Political Leaders & Statesmen",
  "Writers & Poets",
  "Military Leaders & Warriors",
  "Educators & Social Reformers",
  "Explorers & Travelers",
  "Musicians",
  "Ancient Civilizations & Royal Figures",
  "Religious Figures",
  "Innovation Leaders",
] as const;

export type HistoricalSubcategory = (typeof HISTORICAL_SUBCATEGORIES)[number];

const HISTORICAL_RULES: [HistoricalSubcategory, string[]][] = [
  ["Artists & Creative Geniuses", ["vinci", "michelangelo", "gogh", "picasso", "rembrandt", "frida", "monet", "painter", "sculptor", "artist"]],
  ["Scientists & Inventors", ["tesla", "edison", "einstein", "newton", "curie", "darwin", "galileo", "lovelace", "turing", "scientist", "inventor", "physicist", "chemist"]],
  ["Philosophers & Thinkers", ["socrates", "plato", "aristotle", "confucius", "nietzsche", "kant", "descartes", "philosopher", "thinker"]],
  ["Political Leaders & Statesmen", ["lincoln", "churchill", "roosevelt", "mandela", "kennedy", "washington", "jefferson", "president", "senator", "statesman"]],
  ["Writers & Poets", ["shakespeare", "dickens", "austen", "hemingway", "tolstoy", "angelou", "writer", "poet", "novelist", "author"]],
  ["Military Leaders & Warriors", ["nelson", "tecumseh", "grant", "eisenhower", "patton", "wallace", "spartacus", "napoleon", "admiral", "general", "warrior", "commander"]],
  ["Educators & Social Reformers", ["gandhi", "tubman", "douglass", "montessori", "reformer", "activist", "suffrag", "educator"]],
  ["Explorers & Travelers", ["columbus", "magellan", "shackleton", "amundsen", "explorer", "navigator", "voyager"]],
  ["Musicians", ["mozart", "beethoven", "bach", "chopin", "musician", "composer", "pianist", "violinist"]],
  ["Ancient Civilizations & Royal Figures", ["cleopatra", "caesar", "tutankhamun", "ramses", "pharaoh", "emperor", "empress", "queen", "king", "royal", "ancient"]],
  ["Religious Figures", ["buddha", "luther", "aquinas", "teresa", "monk", "priest", "prophet", "saint"]],
  ["Innovation Leaders", ["jobs", "morita", "ford", "gates", "disney", "innovator", "entrepreneur", "founder"]],
];

export function historicalSubcategoryOf(avatarName: string): HistoricalSubcategory | null {
  const name = avatarName ?? "";
  for (const [cat, words] of HISTORICAL_RULES) {
    if (words.some((w) => mentions(name, w))) return cat;
  }
  return null;
}

/**
 * HeyGen exposes no created date, but 106 avatar ids embed one as `yyyymmdd`.
 * An avatar counts as new when that date falls in the most recent year the
 * catalogue contains, which is the only recency signal the API actually gives.
 */
const NEWEST_YEAR = 2024;

export function isNewAvatar(avatar: HeygenAvatar): boolean {
  const stamp = /(\d{4})(\d{2})(\d{2})/.exec(avatar.avatar_id ?? "");
  return !!stamp && Number(stamp[1]) >= NEWEST_YEAR;
}
