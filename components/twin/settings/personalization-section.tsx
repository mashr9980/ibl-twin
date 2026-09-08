"use client";

// Personalization, laid out as twin.memorare.ai's: four tabs, each with an
// empty state until the member fills it in. Everything is saved to their
// platform metadata, so it follows the account.

import { useState } from "react";
import { BookText, Brain, Palette, Trash2, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Alert } from "@/components/twin/alert";
import { useTwinPreferences, type GlossaryTerm, type TwinBrand, type TwinProfile } from "@/hooks/use-twin-preferences";
import { cn } from "@/lib/utils";
import { CHIP, CHIP_OFF, CHIP_ON, CHIP_ROW, FIELD, FIELD_LABEL, HINT, OUTLINE_BTN, PRIMARY_BTN, PRIMARY_BTN_LG, TEXTAREA } from "./ui";

type Tab = "profile" | "memory" | "brand" | "glossary";

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "memory", label: "Memory" },
  { key: "brand", label: "Brand System" },
  { key: "glossary", label: "Brand Glossary" },
];

const EMPTY_PROFILE: TwinProfile = { role: "", industry: "", audience: "", tone: "", topics: "" };
const EMPTY_BRAND: TwinBrand = { primary: "#38A1E5", accent: "#7284FF", font: "", voice: "" };

const PROFILE_FIELDS: { key: keyof TwinProfile; label: string; placeholder: string }[] = [
  { key: "role", label: "What do you do?", placeholder: "Founder, teacher, marketer…" },
  { key: "industry", label: "Industry", placeholder: "Education, SaaS, healthcare…" },
  { key: "audience", label: "Who watches your videos?", placeholder: "Students, customers, my team…" },
  { key: "tone", label: "How should your twin sound?", placeholder: "Warm and plain-spoken" },
  { key: "topics", label: "What do you talk about?", placeholder: "Product updates, lessons, announcements" },
];

/** twin's empty state: a muted tile, a title, a line of explanation and one action. */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[360px]">
      <div className="mb-5 flex size-16 items-center justify-center rounded-[8px] bg-[var(--muted)] text-[var(--muted-foreground)]" aria-hidden="true">
        <Icon className="size-7 text-[var(--muted-foreground)]" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">{description}</p>
      <button type="button" onClick={onAction} className={cn(PRIMARY_BTN_LG, "mt-6")}>
        {action}
      </button>
    </div>
  );
}

export function PersonalizationSection({ tenantKey }: { tenantKey: string }) {
  const { prefs, save, saving, error } = useTwinPreferences(tenantKey);
  const [tab, setTab] = useState<Tab>("profile");
  const [survey, setSurvey] = useState<TwinProfile | null>(null);
  const [brandDraft, setBrandDraft] = useState<TwinBrand | null>(null);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [term, setTerm] = useState<GlossaryTerm>({ term: "", meaning: "" });
  const [termOpen, setTermOpen] = useState(false);

  const store = (patch: Parameters<typeof save>[0]) => void save(patch).catch(() => {});

  return (
    <div className="w-full">
      <div className="-mx-4 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] px-4 py-2 sm:mx-0 sm:rounded-lg sm:border sm:px-3">
        <div className={CHIP_ROW}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-current={tab === t.key ? "page" : undefined}
              onClick={() => setTab(t.key)}
              className={cn(CHIP, tab === t.key ? CHIP_ON : CHIP_OFF)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {error && <Alert tone="warning" className="mb-4">Couldn&apos;t save that. Please try again.</Alert>}

        {tab === "profile" &&
          (survey ? (
            <div className="space-y-5">
              {PROFILE_FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <label className={FIELD_LABEL} htmlFor={`profile-${f.key}`}>{f.label}</label>
                  <input
                    id={`profile-${f.key}`}
                    className={cn(FIELD, "sm:max-w-md")}
                    placeholder={f.placeholder}
                    value={survey[f.key]}
                    onChange={(e) => setSurvey({ ...survey, [f.key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={PRIMARY_BTN}
                  disabled={saving || !survey.role.trim()}
                  onClick={() => {
                    store({ profile: survey });
                    setSurvey(null);
                  }}
                >
                  {saving ? "Saving…" : "Save profile"}
                </button>
                <button type="button" className={OUTLINE_BTN} onClick={() => setSurvey(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : prefs.profile ? (
            <div className="space-y-5">
              <dl className="space-y-4">
                {PROFILE_FIELDS.filter((f) => prefs.profile?.[f.key]).map((f) => (
                  <div key={f.key} className="space-y-1">
                    <dt className={FIELD_LABEL}>{f.label}</dt>
                    <dd className="text-sm text-[var(--muted-foreground)]">{prefs.profile?.[f.key]}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={OUTLINE_BTN} onClick={() => setSurvey({ ...EMPTY_PROFILE, ...prefs.profile })}>
                  Edit answers
                </button>
                <button type="button" className={OUTLINE_BTN} onClick={() => store({ profile: null })}>
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={User}
              title="No profile yet"
              description="Complete a quick survey to personalize your Memorare Twin experience."
              action="Take survey"
              onAction={() => setSurvey(EMPTY_PROFILE)}
            />
          ))}

        {tab === "memory" &&
          (prefs.memory.length || noteOpen ? (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className={FIELD_LABEL} htmlFor="memory-note">Something your twin should remember</label>
                <textarea
                  id="memory-note"
                  className={cn(TEXTAREA, "sm:max-w-md")}
                  placeholder="We ship on Thursdays. Never say 'synergy'."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <button
                  type="button"
                  className={PRIMARY_BTN}
                  disabled={!note.trim() || saving}
                  onClick={() => {
                    store({ memory: [note.trim(), ...prefs.memory] });
                    setNote("");
                  }}
                >
                  {saving ? "Saving…" : "Add"}
                </button>
              </div>
              <ul className="space-y-2">
                {prefs.memory.map((m, i) => (
                  <li key={`${m}-${i}`} className="flex items-start justify-between gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                    <span className="min-w-0 text-sm text-[var(--foreground)]">{m}</span>
                    <button
                      type="button"
                      aria-label={`Forget: ${m.slice(0, 30)}`}
                      onClick={() => store({ memory: prefs.memory.filter((_, j) => j !== i) })}
                      className="shrink-0 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon={Brain}
              title="Nothing remembered yet"
              description="Add facts, phrases and rules your twin should keep in mind when it writes for you."
              action="Add a memory"
              onAction={() => setNoteOpen(true)}
            />
          ))}

        {tab === "brand" &&
          (brandDraft ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:max-w-md sm:grid-cols-2">
                <div className="space-y-2">
                  <label className={FIELD_LABEL} htmlFor="brand-primary">Primary colour</label>
                  <input id="brand-primary" type="color" className="h-10 w-full rounded-[8px] border border-[var(--input)] bg-[var(--background)]" value={brandDraft.primary} onChange={(e) => setBrandDraft({ ...brandDraft, primary: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className={FIELD_LABEL} htmlFor="brand-accent">Accent colour</label>
                  <input id="brand-accent" type="color" className="h-10 w-full rounded-[8px] border border-[var(--input)] bg-[var(--background)]" value={brandDraft.accent} onChange={(e) => setBrandDraft({ ...brandDraft, accent: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className={FIELD_LABEL} htmlFor="brand-font">Typeface</label>
                <input id="brand-font" className={cn(FIELD, "sm:max-w-md")} placeholder="Inter, Söhne, Georgia…" value={brandDraft.font} onChange={(e) => setBrandDraft({ ...brandDraft, font: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className={FIELD_LABEL} htmlFor="brand-voice">Voice and tone</label>
                <textarea id="brand-voice" className={cn(TEXTAREA, "sm:max-w-md")} placeholder="Plain, warm, never salesy." value={brandDraft.voice} onChange={(e) => setBrandDraft({ ...brandDraft, voice: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={PRIMARY_BTN} disabled={saving} onClick={() => { store({ brand: brandDraft }); setBrandDraft(null); }}>
                  {saving ? "Saving…" : "Save brand"}
                </button>
                <button type="button" className={OUTLINE_BTN} onClick={() => setBrandDraft(null)}>Cancel</button>
              </div>
            </div>
          ) : prefs.brand ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                {(["primary", "accent"] as const).map((k) => (
                  <span key={k} className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)]">
                    <span className="size-4 rounded-full border border-[var(--border)]" style={{ background: prefs.brand?.[k] }} aria-hidden="true" />
                    {prefs.brand?.[k]}
                  </span>
                ))}
              </div>
              {prefs.brand.font && <p className="text-sm text-[var(--muted-foreground)]">Typeface: {prefs.brand.font}</p>}
              {prefs.brand.voice && <p className="max-w-md text-sm text-[var(--muted-foreground)]">{prefs.brand.voice}</p>}
              <div className="flex flex-wrap gap-3">
                <button type="button" className={OUTLINE_BTN} onClick={() => setBrandDraft({ ...EMPTY_BRAND, ...prefs.brand })}>Edit brand</button>
                <button type="button" className={OUTLINE_BTN} onClick={() => store({ brand: null })}>Clear</button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Palette}
              title="No brand system yet"
              description="Set your colours, typeface and tone so every video you make looks and sounds like you."
              action="Set up brand"
              onAction={() => setBrandDraft(EMPTY_BRAND)}
            />
          ))}

        {tab === "glossary" &&
          (prefs.glossary.length || termOpen ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:max-w-xl sm:grid-cols-[1fr_2fr]">
                <div className="space-y-2">
                  <label className={FIELD_LABEL} htmlFor="glossary-term">Term</label>
                  <input id="glossary-term" className={FIELD} placeholder="ibl.ai" value={term.term} onChange={(e) => setTerm({ ...term, term: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className={FIELD_LABEL} htmlFor="glossary-meaning">How to say or use it</label>
                  <input id="glossary-meaning" className={FIELD} placeholder='Say "eye-bee-ell dot AI"' value={term.meaning} onChange={(e) => setTerm({ ...term, meaning: e.target.value })} />
                </div>
              </div>
              <button
                type="button"
                className={PRIMARY_BTN}
                disabled={!term.term.trim() || saving}
                onClick={() => {
                  store({ glossary: [{ term: term.term.trim(), meaning: term.meaning.trim() }, ...prefs.glossary] });
                  setTerm({ term: "", meaning: "" });
                }}
              >
                {saving ? "Saving…" : "Add term"}
              </button>
              <ul className="divide-y divide-[var(--border)] rounded-[8px] border border-[var(--border)]">
                {prefs.glossary.map((g, i) => (
                  <li key={`${g.term}-${i}`} className="flex items-start justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[var(--foreground)]">{g.term}</span>
                      {g.meaning && <span className="block text-sm text-[var(--muted-foreground)]">{g.meaning}</span>}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${g.term}`}
                      onClick={() => store({ glossary: prefs.glossary.filter((_, j) => j !== i) })}
                      className="shrink-0 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState
              icon={BookText}
              title="No glossary yet"
              description="Teach your twin the names, products and phrases it must always get right."
              action="Add a term"
              onAction={() => setTermOpen(true)}
            />
          ))}

        <p className={cn(HINT, "mt-6")} aria-live="polite">{saving ? "Saving…" : ""}</p>
      </div>
    </div>
  );
}
