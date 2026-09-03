"use client";

/**
 * Avatar picker (teardown §2.3). Unlike the flat Gallery, this is twin's
 * two-step flow: characters first, then that character's looks behind a
 * ← Back breadcrumb.
 *
 * HeyGen has no "character" entity, but its names encode one, with looks as
 * parenthesised variants ("Amanda in Blue Shirt (Front)" / "(Left)" /
 * "(Right)"). 1,264 avatars collapse to 1,199 characters, 32 of which have
 * several looks, so the grouping is read from real data rather than invented.
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, LayoutGrid, List, Search, UserRound } from "lucide-react";

import { GenerateModal } from "@/components/twin/generate-modal";
import { AvatarCard, HeygenGate } from "@/components/twin/avatar-gallery";
import { useHeygenCredential } from "@/hooks/use-heygen-credential";
import {
  HeygenCredentialMissingError,
  invalidateAvatarCatalogue,
  listHeygenAvatars,
  type HeygenAvatar,
} from "@/lib/heygen/rest";
import { cn } from "@/lib/utils";

const PAGE = 60;

/**
 * "Amanda in Blue Shirt (Front)" → "Amanda in Blue Shirt"
 *
 * Only a parenthesis or a *spaced* dash separates a look. Splitting on any
 * hyphen turned "Aditya in Blue t-shirt" into "Aditya in Blue t".
 */
function characterOf(name: string): string {
  return name.split(/\s*\(|\s+-\s+/)[0].trim() || name;
}
/** "Amanda in Blue Shirt (Front)" → "Front" */
function lookOf(name: string): string {
  const m = name.match(/\(([^)]+)\)/);
  return m ? m[1].trim() : "Default";
}

interface Character {
  name: string;
  looks: HeygenAvatar[];
}

function PickerInner() {
  const credential = useHeygenCredential();
  const [avatars, setAvatars] = useState<HeygenAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [shown, setShown] = useState(PAGE);
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState<Character | null>(null);
  const [selected, setSelected] = useState<HeygenAvatar | null>(null);

  useEffect(() => {
    if (credential !== "ok") {
      if (credential === "missing") setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listHeygenAvatars()
      .then(({ avatars }) => !cancelled && (setAvatars(avatars), setError(null)))
      .catch((err) => !cancelled && setError(err instanceof HeygenCredentialMissingError ? "gate" : "load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [credential, reloadKey]);

  useEffect(() => setShown(PAGE), [query]);

  const characters = useMemo(() => {
    const by = new Map<string, HeygenAvatar[]>();
    for (const a of avatars) {
      const key = characterOf(a.avatar_name ?? "");
      const list = by.get(key);
      if (list) list.push(a);
      else by.set(key, [a]);
    }
    return [...by.entries()].map(([name, looks]) => ({ name, looks }));
  }, [avatars]);

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? characters.filter((c) => c.name.toLowerCase().includes(q)) : characters;
  }, [characters, query]);

  const visible = matching.slice(0, shown);

  function choose(c: Character) {
    // One look is not a choice — go straight to generation, as twin does.
    if (c.looks.length === 1) setSelected(c.looks[0]);
    else setOpen(c);
  }

  if (credential === "missing" || error === "gate") {
    return (
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-7 text-[24px] font-semibold tracking-[-0.6px] text-[var(--content-title)]">Avatar</h1>
        <HeygenGate />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-7 sm:mb-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.6px] text-[var(--content-title)]">Avatar</h1>
        <p className="mt-1 text-[14px] text-[var(--content-caption)]">
          Choose an Avatar, add or select a Voice, and get an Avatar Video in minutes.
        </p>
      </header>

      {open ? (
        <>
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-[13.5px]" aria-label="Breadcrumb">
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="flex items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1 text-[var(--brand)] transition-colors hover:bg-[var(--canvas-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              <ArrowLeft size={15} strokeWidth={1.75} /> Back
            </button>
            <span className="font-medium text-[var(--content-title)]">{open.name}</span>
            <span className="text-[var(--content-caption)]">· {open.looks.length} looks</span>
          </nav>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {open.looks.map((a) => (
              // Inside a character, the full name repeats the character and
              // truncates away the one thing that differs — show the look.
              <AvatarCard
                key={a.avatar_id}
                avatar={{ ...a, avatar_name: lookOf(a.avatar_name ?? "") }}
                onSelect={() => setSelected(a)}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="mb-7 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative w-full sm:max-w-[280px]">
              <span className="sr-only">Search avatars</span>
              <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--content-caption)]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-9 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-[13.5px] text-[var(--content-title)] outline-none placeholder:text-[var(--content-caption)] focus:border-[var(--brand)]"
              />
            </label>
            <div role="group" aria-label="View" className="flex self-start rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] p-0.5">
              {(["grid", "list"] as const).map((v) => {
                const Icon = v === "grid" ? LayoutGrid : List;
                return (
                  <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v}
                    aria-label={v === "grid" ? "Grid view" : "List view"}
                    className={cn("flex h-8 w-9 items-center justify-center rounded-[4px] transition-colors",
                      view === v ? "bg-[var(--composer-chip)] text-[var(--brand)]" : "text-[var(--content-caption)] hover:text-[var(--content-title)]")}>
                    <Icon size={16} strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          </div>

          {error === "load" ? (
            <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-10 text-center">
              <p role="alert" className="text-[14px] font-medium text-[var(--content-title)]">Couldn&apos;t load the avatar catalogue</p>
              <button type="button" onClick={() => { invalidateAvatarCatalogue(); setError(null); setReloadKey((k) => k + 1); }}
                className="twin-gradient mt-4 h-9 px-4 text-[13px] font-semibold">Try again</button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)]">
                  <div className="aspect-4/5 animate-pulse bg-[var(--canvas-muted)]" />
                  <div className="space-y-2 p-3">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-[var(--canvas-muted)]" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--canvas-muted)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <UserRound size={28} strokeWidth={1.5} className="mx-auto mb-3 text-[var(--content-caption)]" />
              <p className="text-[14px] font-medium text-[var(--content-title)]">No avatars found</p>
              <p className="mt-1 text-[13px] text-[var(--content-caption)]">Try another search or category chip.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {visible.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => choose(c)}
                  className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] text-left shadow-[var(--shadow-card)] transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
                >
                  <div className="relative aspect-4/5 overflow-hidden bg-[var(--canvas-muted)]">
                    {c.looks[0].preview_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.looks[0].preview_image_url} alt={`${c.name} avatar preview`} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><UserRound size={24} className="text-[var(--content-caption)]" /></div>
                    )}
                    {c.looks.length > 1 && (
                      <span className="absolute left-2 top-2 rounded-[var(--radius-pill)] bg-[var(--brand)] px-2 py-0.5 text-[11px] font-medium text-white">
                        {c.looks.length} looks
                      </span>
                    )}
                    <div className="absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
                      <span className="text-[13px] font-medium text-white">Click to Select</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="truncate text-[14px] font-semibold text-[var(--content-title)]">{c.name}</p>
                    <p className="mt-0.5 truncate text-[12px] text-[var(--content-caption)]">
                      {c.looks.length > 1 ? c.looks.map((l) => lookOf(l.avatar_name ?? "")).join(" · ") : c.looks[0].gender ?? "Avatar"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)]">
              {visible.map((c) => (
                <li key={c.name}>
                  <button type="button" onClick={() => choose(c)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-[var(--canvas-muted)]">
                    <span className="h-11 w-11 flex-none overflow-hidden rounded-full bg-[var(--canvas-muted)]">
                      {c.looks[0].preview_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.looks[0].preview_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[var(--content-title)]">{c.name}</span>
                      <span className="block truncate text-[12.5px] text-[var(--content-caption)]">
                        {c.looks.length > 1 ? `${c.looks.length} looks` : c.looks[0].gender ?? "Avatar"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && !error && matching.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-[12.5px] text-[var(--content-caption)]">
                Showing {visible.length} of {matching.length} character{matching.length === 1 ? "" : "s"}
              </p>
              {visible.length < matching.length && (
                <button type="button" onClick={() => setShown((n) => n + PAGE)}
                  className="h-9 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-5 text-[13px] font-medium text-[var(--content-title)] transition-colors hover:bg-[var(--canvas-muted)]">
                  Load more
                </button>
              )}
            </div>
          )}
        </>
      )}

      {selected && <GenerateModal avatar={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function AvatarPickerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[13.5px] text-[var(--content-caption)]">Loading…</div>}>
      <PickerInner />
    </Suspense>
  );
}
