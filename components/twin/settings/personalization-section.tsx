"use client";

// Personalization, laid out as twin.memorare.ai's: four tabs, each with an
// empty state until the member fills it in. Everything is saved to their
// platform metadata, so it follows the account.

import { useMemo, useRef, useState } from "react";
import {
  useCreateGlobalMemoryMutation,
  useDeleteGlobalMemoryMutation,
  useGetGlobalMemoriesQuery,
} from "@iblai/iblai-js/data-layer";
import { Box, ChevronDown, FileText, Plus, SlidersHorizontal, Trash2, Upload, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Alert } from "@/components/twin/alert";
import { useTwinPreferences, type GlossaryKind, type GlossaryTerm, type TwinProfile } from "@/hooks/use-twin-preferences";
import { currentUserFirstName, currentUsername } from "@/lib/iblai/access";
import { cn } from "@/lib/utils";
import { PersonalizationSurvey } from "./personalization-survey";
import { CHIP, CHIP_OFF, CHIP_ON, CHIP_ROW, FIELD, FIELD_LABEL, HINT, OUTLINE_BTN, PRIMARY_BTN, PRIMARY_BTN_LG, TEXTAREA } from "./ui";

type Tab = "profile" | "memory" | "brand" | "glossary";

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "memory", label: "Memory" },
  { key: "brand", label: "Brand System" },
  { key: "glossary", label: "Brand Glossary" },
];

const EMPTY_PROFILE: TwinProfile = { use: "", role: "", industry: "", audience: "", tone: "", topics: "" };

const PROFILE_FIELDS: { key: keyof TwinProfile; label: string; placeholder: string }[] = [
  { key: "use", label: "Using Memorare Twin for", placeholder: "Business, personal, or student use" },
  { key: "role", label: "What do you do?", placeholder: "Founder, teacher, marketer…" },
  { key: "industry", label: "Industry", placeholder: "Education, SaaS, healthcare…" },
  { key: "audience", label: "Who watches your videos?", placeholder: "Students, customers, my team…" },
  { key: "tone", label: "How should your twin sound?", placeholder: "Warm and plain-spoken" },
  { key: "topics", label: "What do you talk about?", placeholder: "Product updates, lessons, announcements" },
];

/** twin's empty state: a muted tile, a title, a line of explanation and, usually, one action. */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  onAction,
  className,
  descriptionClassName,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
  className?: string;
  descriptionClassName?: string;
}) {
  return (
    <div className={cn("flex min-h-[320px] flex-col items-center justify-center px-4 py-10 text-center sm:min-h-[360px]", className)}>
      <div className="mb-5 flex size-16 items-center justify-center rounded-[8px] bg-[var(--muted)] text-[var(--muted-foreground)]" aria-hidden="true">
        <Icon className="size-7 text-[var(--muted-foreground)]" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className={cn("mt-2 max-w-sm text-sm text-[var(--muted-foreground)]", descriptionClassName)}>{description}</p>
      {action && onAction && (
        <button type="button" onClick={onAction} className={cn(PRIMARY_BTN_LG, "mt-6")}>
          {action}
        </button>
      )}
    </div>
  );
}

type GlossaryView = "pronunciation" | "translation";

// twin's two views; Translations shows two sections side by side
const GLOSSARY_VIEWS: { key: GlossaryView; label: string; sections: GlossaryKind[] }[] = [
  { key: "pronunciation", label: "Pronunciations", sections: ["pronunciation"] },
  { key: "translation", label: "Translations", sections: ["force_translate", "dont_translate"] },
];

const GLOSSARY_SECTIONS: Record<GlossaryKind, { label: string; meaning: string | null; placeholder: string }> = {
  pronunciation: { label: "Pronunciations", meaning: "How to say it", placeholder: 'Say "eye-bee-ell dot AI"' },
  force_translate: { label: "Force Translate", meaning: "Translation", placeholder: "The word in the other language" },
  dont_translate: { label: "Don't Translate", meaning: null, placeholder: "" },
};

/** A CSV of `term,meaning` rows. A header row is skipped, quotes are stripped. */
function parseGlossaryCsv(text: string): { term: string; meaning: string }[] {
  const clean = (v: string) => v.trim().replace(/^"(.*)"$/, "$1").trim();
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const at = line.indexOf(",");
      return at === -1 ? { term: clean(line), meaning: "" } : { term: clean(line.slice(0, at)), meaning: clean(line.slice(at + 1)) };
    })
    .filter((r, i) => r.term && !(i === 0 && /^(term|word|name)$/i.test(r.term)));
}

type PlatformMemory = { id: number; content: string; is_auto_generated?: boolean; created_at?: string };

// twin's toolbar controls on the Memory tab
const TOOL_BTN =
  "inline-flex h-9 items-center justify-center gap-1 whitespace-nowrap rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-normal text-[var(--foreground)] shadow-none transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0";

export function PersonalizationSection({ tenantKey }: { tenantKey: string }) {
  const { prefs, save, saving, error } = useTwinPreferences(tenantKey);
  const [tab, setTab] = useState<Tab>("profile");
  const [survey, setSurvey] = useState<TwinProfile | null>(null);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [term, setTerm] = useState<GlossaryTerm>({ term: "", meaning: "" });
  const [termOpen, setTermOpen] = useState<GlossaryKind | null>(null);
  const [view, setView] = useState<GlossaryView>("pronunciation");
  const csvInput = useRef<HTMLInputElement>(null);
  const csvTarget = useRef<GlossaryKind>("pronunciation");
  const [memoryMenu, setMemoryMenu] = useState(false);
  const [memoryFilter, setMemoryFilter] = useState<"all" | "mine" | "learned">("all");
  const [memoryError, setMemoryError] = useState<string | null>(null);

  // The platform keeps a member's memories itself (ibl.ai memsearch): what the
  // twin should know about them, added here or learned from their sessions.
  const username = currentUsername();
  const memories = useGetGlobalMemoriesQuery({ org: tenantKey, userId: username } as never, { skip: !tenantKey || !username });
  const [createMemory, creating] = useCreateGlobalMemoryMutation();
  const [deleteMemory, deleting] = useDeleteGlobalMemoryMutation();
  const memoryList = useMemo(() => {
    const raw = (memories.data as { results?: PlatformMemory[] } | PlatformMemory[] | undefined);
    const all = Array.isArray(raw) ? raw : raw?.results ?? [];
    return all.filter((m) => memoryFilter === "all" || (memoryFilter === "mine" ? !m.is_auto_generated : m.is_auto_generated));
  }, [memories.data, memoryFilter]);
  const memoryBusy = creating.isLoading || deleting.isLoading;

  const remember = async (content: string) => {
    setMemoryError(null);
    try {
      await createMemory({ org: tenantKey, userId: username, content } as never).unwrap();
    } catch {
      setMemoryError("Couldn't save that memory. Please try again.");
    }
  };
  const forget = async (ids: number[]) => {
    setMemoryError(null);
    try {
      await Promise.all(ids.map((memoryId) => deleteMemory({ org: tenantKey, userId: username, memoryId } as never).unwrap()));
    } catch {
      setMemoryError("Couldn't remove that memory. Please try again.");
    }
  };

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
          (prefs.profile ? (
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

        <PersonalizationSurvey
          open={survey !== null}
          initial={survey ?? EMPTY_PROFILE}
          onClose={() => setSurvey(null)}
          onComplete={(profile) => {
            store({ profile });
            setSurvey(null);
          }}
        />

        {tab === "memory" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="relative">
                <select
                  aria-label="Filter memory"
                  className={cn(TOOL_BTN, "w-auto min-w-[130px] appearance-none pr-8")}
                  value={memoryFilter}
                  onChange={(e) => setMemoryFilter(e.target.value as "all" | "mine" | "learned")}
                >
                  <option value="all">All memory</option>
                  <option value="mine">Added by me</option>
                  <option value="learned">Learned automatically</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
              </div>
              <button type="button" className={TOOL_BTN} onClick={() => setNoteOpen(true)}>
                <Plus strokeWidth={1.75} aria-hidden="true" />
                Add
              </button>
              <div className="relative">
                <button
                  type="button"
                  aria-label="Memory actions"
                  aria-haspopup="menu"
                  aria-expanded={memoryMenu}
                  disabled={memoryList.length === 0 || memoryBusy}
                  onClick={() => setMemoryMenu((v) => !v)}
                  className={cn(TOOL_BTN, "size-9 px-0")}
                >
                  <SlidersHorizontal strokeWidth={1.75} aria-hidden="true" />
                </button>
                {memoryMenu && (
                  <div role="menu" className="absolute right-0 z-10 mt-1 min-w-[180px] rounded-[8px] border border-[var(--border)] bg-[var(--card)] p-1 shadow-md">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center rounded-[6px] px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--accent)]"
                      onClick={() => {
                        void forget(memoryList.map((m) => m.id));
                        setMemoryMenu(false);
                      }}
                    >
                      Clear all memories
                    </button>
                  </div>
                )}
              </div>
            </div>

            {noteOpen && (
              <div className="space-y-2">
                <label className={FIELD_LABEL} htmlFor="memory-note">Something your twin should remember</label>
                <textarea
                  id="memory-note"
                  className={cn(TEXTAREA, "sm:max-w-md")}
                  placeholder="We ship on Thursdays. Never say 'synergy'."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className={PRIMARY_BTN}
                    disabled={!note.trim() || memoryBusy}
                    onClick={() => {
                      void remember(note.trim());
                      setNote("");
                      setNoteOpen(false);
                    }}
                  >
                    {creating.isLoading ? "Saving…" : "Add"}
                  </button>
                  <button type="button" className={OUTLINE_BTN} onClick={() => { setNote(""); setNoteOpen(false); }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {memoryError && <Alert tone="warning" onDismiss={() => setMemoryError(null)}>{memoryError}</Alert>}
            {memories.isError && !memoryError && (
              <Alert tone="warning">Memory isn&apos;t available for your account yet. Ask the workspace owner to enable it.</Alert>
            )}
            {memoryList.length ? (
              <ul className="space-y-2">
                {memoryList.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
                    <span className="min-w-0 text-sm text-[var(--foreground)]">
                      {m.content}
                      {m.is_auto_generated && <span className="ml-2 text-xs text-[var(--muted-foreground)]">learned</span>}
                    </span>
                    <button
                      type="button"
                      aria-label={`Forget: ${m.content.slice(0, 30)}`}
                      disabled={memoryBusy}
                      onClick={() => void forget([m.id])}
                      className="shrink-0 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] disabled:opacity-50"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : memories.isLoading ? (
              <p className={cn(HINT, "py-6 text-center")}>Loading…</p>
            ) : (
              !noteOpen && (
                <EmptyState
                  icon={Box}
                  title="No memories yet"
                  description="As you use Memorare Twin, it will learn from your conversations and save helpful information here."
                  className="min-h-[280px] py-12 sm:min-h-[280px]"
                  descriptionClassName="max-w-md"
                />
              )
            )}
          </div>
        )}

        {tab === "brand" && (
          <div className="flex min-h-[280px] items-center justify-center px-4 py-10">
            <p className="text-center text-sm text-[var(--muted-foreground)]">Brand System is coming soon.</p>
          </div>
        )}

        {tab === "glossary" &&
          (() => {
            const current = GLOSSARY_VIEWS.find((v) => v.key === view) ?? GLOSSARY_VIEWS[0];
            const owner = currentUserFirstName();
            const kindOf = (g: GlossaryTerm): GlossaryKind => g.kind ?? "pronunciation";
            const pickCsv = (kind: GlossaryKind) => {
              csvTarget.current = kind;
              csvInput.current?.click();
            };
            const importCsv = async (file: File) => {
              const rows = parseGlossaryCsv(await file.text()).map((r) => ({ ...r, kind: csvTarget.current }));
              if (rows.length) store({ glossary: [...rows, ...prefs.glossary] });
            };
            const addTerm = (kind: GlossaryKind) => {
              store({ glossary: [{ term: term.term.trim(), meaning: term.meaning.trim(), kind }, ...prefs.glossary] });
              setTerm({ term: "", meaning: "" });
              setTermOpen(null);
            };
            const ICON_BTN = "inline-flex size-8 items-center justify-center rounded-md text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]";

            const renderSection = (kind: GlossaryKind, withActions: boolean) => {
              const meta = GLOSSARY_SECTIONS[kind];
              const entries = prefs.glossary.filter((g) => kindOf(g) === kind);
              const editing = termOpen === kind;
              return (
                <section key={kind} className="min-w-0 flex-1 space-y-3">
                  {withActions ? (
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-medium text-[var(--foreground)]">{meta.label}</h3>
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label={`Add ${meta.label.toLowerCase().replace(/s$/, "")}`} onClick={() => setTermOpen(kind)} className={ICON_BTN}>
                          <Plus className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={`Upload ${meta.label.toLowerCase()} CSV`} onClick={() => pickCsv(kind)} className={ICON_BTN}>
                          <Upload className="size-4" strokeWidth={1.75} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <h3 className="text-sm font-medium text-[var(--foreground)]">{meta.label}</h3>
                  )}

                  <div className="rounded-[8px] border border-[var(--border)] bg-[var(--card)]">
                    {editing && (
                      <div className="space-y-3 border-b border-[var(--border)] p-4">
                        <div className={cn("grid gap-3", meta.meaning && "sm:grid-cols-[1fr_2fr]")}>
                          <div className="space-y-2">
                            <label className={FIELD_LABEL} htmlFor={`glossary-${kind}-term`}>Term</label>
                            <input id={`glossary-${kind}-term`} className={FIELD} placeholder="ibl.ai" value={term.term} onChange={(e) => setTerm({ ...term, term: e.target.value })} />
                          </div>
                          {meta.meaning && (
                            <div className="space-y-2">
                              <label className={FIELD_LABEL} htmlFor={`glossary-${kind}-meaning`}>{meta.meaning}</label>
                              <input id={`glossary-${kind}-meaning`} className={FIELD} placeholder={meta.placeholder} value={term.meaning} onChange={(e) => setTerm({ ...term, meaning: e.target.value })} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button type="button" className={PRIMARY_BTN} disabled={!term.term.trim() || saving} onClick={() => addTerm(kind)}>
                            {saving ? "Saving…" : "Add term"}
                          </button>
                          <button type="button" className={OUTLINE_BTN} onClick={() => { setTerm({ term: "", meaning: "" }); setTermOpen(null); }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {entries.length ? (
                      <ul className="divide-y divide-[var(--border)]">
                        {entries.map((g) => {
                          const i = prefs.glossary.indexOf(g);
                          return (
                            <li key={`${g.term}-${i}`} className="flex items-start justify-between gap-3 px-4 py-3">
                              <span className="min-w-0">
                                <span className="block text-sm font-medium text-[var(--foreground)]">{g.term}</span>
                                {g.meaning && <span className="block text-sm text-[var(--muted-foreground)]">{g.meaning}</span>}
                              </span>
                              <button type="button" aria-label={`Remove ${g.term}`} onClick={() => store({ glossary: prefs.glossary.filter((_, j) => j !== i) })} className="shrink-0 text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
                                <Trash2 className="size-4" strokeWidth={1.75} />
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      !editing && (
                        <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-10 text-center">
                          <FileText className="mb-4 size-10 text-[var(--brand)] dark:text-[var(--brand-on-dark)]" strokeWidth={1.25} aria-hidden="true" />
                          <p className="text-sm text-[var(--muted-foreground)]">{`No '${meta.label}' added yet`}</p>
                          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                            <button type="button" className={cn(TOOL_BTN, "gap-2 px-4")} onClick={() => pickCsv(kind)}>
                              <Upload strokeWidth={1.75} aria-hidden="true" />
                              Upload CSV
                            </button>
                            <button type="button" className={cn(TOOL_BTN, "gap-2 px-4")} onClick={() => setTermOpen(kind)}>
                              <Plus strokeWidth={1.75} aria-hidden="true" />
                              Add manually
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </section>
              );
            };

            return (
              <div className="space-y-5">
                <input
                  ref={csvInput}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void importCsv(f);
                    e.target.value = "";
                  }}
                />

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex justify-center sm:flex-1 sm:justify-center">
                    <div role="tablist" aria-label="Glossary view" className="inline-flex rounded-[8px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_50%,transparent)] p-1">
                      {GLOSSARY_VIEWS.map((v) => (
                        <button
                          key={v.key}
                          type="button"
                          role="tab"
                          aria-selected={view === v.key}
                          onClick={() => { setView(v.key); setTermOpen(null); }}
                          className={cn(
                            "rounded-[8px] px-4 py-1.5 text-sm font-medium transition-colors",
                            view === v.key ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                          )}
                        >
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <select aria-label="Glossary" className={cn(TOOL_BTN, "w-full min-w-[200px] appearance-none justify-between pr-8 sm:w-auto sm:min-w-[220px]")} defaultValue="own">
                      <option value="own">{owner ? `${owner} Brand Glossary` : "My Brand Glossary"}</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" aria-hidden="true" />
                  </div>
                </div>

                {current.sections.length > 1 ? (
                  <div className="grid gap-6 lg:grid-cols-2">{current.sections.map((k) => renderSection(k, false))}</div>
                ) : (
                  renderSection(current.sections[0], true)
                )}
              </div>
            );
          })()}

        <p className={cn(HINT, "mt-6")} aria-live="polite">{saving ? "Saving…" : ""}</p>
      </div>
    </div>
  );
}
