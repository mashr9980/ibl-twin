"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, LayoutGrid, List, Search, UserRound } from "lucide-react";

import {
  HeygenCredentialMissingError,
  invalidateAvatarCatalogue,
  listHeygenAvatars,
  type HeygenAvatar,
} from "@/lib/heygen/rest";
import { useHeygenCredential } from "@/hooks/use-heygen-credential";
import { groupCharacters, type Character } from "@/lib/twin/characters";
import { historicalSubcategoryOf, isNewAvatar, subcategoryOf } from "@/lib/twin/categories";
import { EmptyInboxArt } from "@/components/twin/nav-icons";
import { cn } from "@/lib/utils";

export type Category = "ALL" | "MODERN" | "HISTORY";

const CHIPS: { key: Category; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "MODERN", label: "Educational" },
  { key: "HISTORY", label: "Historical" },
];

/** 1,264 cards is ~10k DOM nodes. Render a page at a time. */
const PAGE = 60;

/**
 * HeyGen's stock catalogue is modern presenters, which is exactly what twin
 * files under MODERN / "Educational". Historical figures are a separately
 * curated set, so the HISTORY chip reports honestly when it's empty.
 */
function categoryOf(_a: HeygenAvatar): Category {
  return "MODERN";
}

export function HeygenGate({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--card)] text-center",
        compact ? "p-6" : "p-10",
      )}
    >
      <UserRound size={28} strokeWidth={1.5} className="mx-auto mb-3 text-[var(--content-caption)]" />
      <p className="text-sm font-semibold text-[var(--content-title)] sm:text-base">HeyGen integration required</p>
      <p className="mx-auto mt-1.5 max-w-md text-xs leading-snug text-[var(--content-caption)] sm:text-[13px]">
        This tenant has no HeyGen credential yet. Add one named{" "}
        <code className="rounded bg-[var(--secondary)] px-1 py-0.5 text-[11px] sm:text-[12px]">heygen</code> in your
        ibl.ai integration settings and this will light up.
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)]">
      <div className="aspect-4/5 animate-pulse bg-[var(--canvas-muted)]" />
      <div className="space-y-2 p-3">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-[var(--canvas-muted)]" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--canvas-muted)]" />
      </div>
    </div>
  );
}


/**
 * Twin previews a character as a collage: one tall look beside two stacked,
 * separated by 3px, with only the outer corners rounded.
 */

/**
 * Twin's tile for the Create Twin gallery: one portrait at 4:5 with the
 * "Click to Select" scrim, and the name and category under a rule. The
 * collage card is only used on the browse pages.
 */
export function AvatarTile({ character, onSelect }: { character: Character; onSelect?: (a: HeygenAvatar) => void }) {
  const first = character.looks[0];
  const label = character.looks.length > 1 ? `${character.looks.length} looks` : first?.gender ?? "Avatar";
  return (
    <div className="group flex w-full flex-col overflow-hidden rounded-[9px] border border-[var(--border)] bg-[var(--card)] text-left text-[var(--card-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[color-mix(in_oklab,var(--muted)_50%,transparent)] dark:bg-[color-mix(in_oklab,var(--muted)_30%,transparent)]">
        <button
          type="button"
          onClick={() => onSelect?.(first)}
          aria-label={`Select ${character.name}, ${label}`}
          className="absolute inset-0 z-0 block w-full cursor-pointer text-left"
        >
          {first?.preview_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={first.preview_image_url} alt={character.name} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center"><UserRound size={22} className="text-[var(--content-caption)]" /></span>
          )}
        </button>
        {/* Visible by default on touch, hover-only from sm up, as twin does. */}
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/50 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
          aria-hidden="true"
        >
          <span className="px-2 text-center text-[11px] font-semibold leading-snug text-white sm:text-xs">Click to Select</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onSelect?.(first)}
        className="w-full border-t border-[var(--border)] px-2 py-2 text-center transition-colors hover:bg-[var(--accent)] sm:px-2.5 sm:py-1.5"
      >
        <span className="block truncate text-[11px] font-semibold leading-snug text-[var(--card-foreground)] sm:text-xs">{character.name}</span>
        <span className="mt-0.5 block truncate text-[10px] leading-snug text-[var(--content-title)] sm:text-[11px]">{label}</span>
      </button>
    </div>
  );
}

export function CharacterCard({
  character,
  onSelect,
}: {
  character: Character;
  onSelect?: (a: HeygenAvatar) => void;
}) {
  const open = () => onSelect?.(character.looks[0]);
  const isNew = character.looks.some(isNewAvatar);
  return (
    <div className="group/card relative flex w-full cursor-pointer flex-col gap-2 overflow-hidden rounded-[9px] border border-[color-mix(in_oklab,var(--border)_50%,transparent)] bg-[var(--card)] p-2 text-[var(--card-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-150 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
      <button
        type="button"
        onClick={open}
        aria-label={`Open ${character.name}`}
        className="relative w-full overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[7px]">
          <div className="flex h-full w-full items-stretch gap-[3px]">
            <div className="relative h-full min-w-0 flex-[1.65] overflow-hidden rounded-l-[7px] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)]">
              {character.looks[0]?.preview_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.looks[0].preview_image_url} alt={character.name} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center"><UserRound size={22} className="text-[var(--content-caption)]" /></div>
              )}
            </div>
            <div className="flex h-full min-w-0 flex-1 flex-col gap-[3px]">
              {[1, 2].map((i) => {
                const look = character.looks[i] ?? character.looks[character.looks.length - 1];
                return (
                  <div
                    key={i}
                    className={cn(
                      "relative min-h-0 flex-1 overflow-hidden bg-[color-mix(in_oklab,var(--muted)_40%,transparent)]",
                      i === 2 && "rounded-br-[7px]",
                    )}
                  >
                    {look?.preview_image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={look.preview_image_url} alt={character.name} loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {isNew && (
            <span className="absolute left-2 top-2 z-10 rounded-md bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] px-1.5 py-0.5 text-[9px] font-semibold uppercase leading-none tracking-wide text-white">
              New
            </span>
          )}
        </div>
      </button>

      <button type="button" onClick={open} className="min-w-0 self-stretch px-1 pb-1 text-left">
        <span className="block truncate text-[15px] font-semibold leading-snug text-[var(--content-title)]">{character.name}</span>
        <span className="mt-0.5 block truncate text-xs leading-snug text-[var(--content-title)]">
          {character.looks.length > 1 ? `${character.looks.length} looks` : character.looks[0]?.gender ?? "Avatar"}
        </span>
      </button>
    </div>
  );
}

export function AvatarCard({ avatar, onSelect }: { avatar: HeygenAvatar; onSelect?: (a: HeygenAvatar) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(avatar)}
      className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] text-left shadow-[var(--shadow-card)] transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-[var(--canvas-muted)]">
        {avatar.preview_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar.preview_image_url} alt={`${avatar.avatar_name} avatar preview`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UserRound size={24} className="text-[var(--content-caption)]" />
          </div>
        )}
        <div className="absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
          <span className="text-[13px] font-medium text-white">Click to Select</span>
        </div>
      </div>
      <div className="p-3">
        <p className="truncate text-[14px] font-semibold text-[var(--content-title)]">{avatar.avatar_name}</p>
        <p className="mt-0.5 truncate text-[12px] text-[var(--content-caption)]">{avatar.gender ?? "Avatar"}</p>
      </div>
    </button>
  );
}

export function AvatarGallery({
  title,
  onSelect,
  limit,
  /** "tiles" is twin's Create Twin gallery; "collage" is the browse pages. */
  variant = "collage",
  showControls = true,
}: {
  title: string;
  onSelect?: (a: HeygenAvatar) => void;
  /** Render only the first N (used by the Create Twin teaser grid). */
  limit?: number;
  variant?: "tiles" | "collage";
  showControls?: boolean;
}) {
  const params = useSearchParams();
  const credential = useHeygenCredential();
  const [avatars, setAvatars] = useState<HeygenAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const subcategory = params.get("subcategory") ?? "";

  const [view, setView] = useState<"grid" | "list">("grid");
  const [category, setCategory] = useState<Category>("ALL");
  const [shown, setShown] = useState(PAGE);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const c = params.get("category");
    setCategory(c === "MODERN" || c === "HISTORY" ? c : "ALL");
  }, [params]);

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
  useEffect(() => setShown(PAGE), [query, category, subcategory]);

  function retry() {
    invalidateAvatarCatalogue();
    setError(null);
    setReloadKey((k) => k + 1);
  }
  const counts = useMemo(() => ({
    ALL: avatars.length,
    MODERN: avatars.filter((a) => categoryOf(a) === "MODERN").length,
    HISTORY: avatars.filter((a) => categoryOf(a) === "HISTORY").length,
  }), [avatars]);

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return avatars.filter(
      (a) =>
        (category === "ALL" || categoryOf(a) === category) &&
        (!subcategory ||
          (category === "HISTORY"
            ? historicalSubcategoryOf(a.avatar_name ?? "") === subcategory
            : subcategoryOf(a.avatar_name ?? "") === subcategory)) &&
        (!q || (a.avatar_name ?? "").toLowerCase().includes(q)),
    );
  }, [avatars, query, category, subcategory]);
  const characters = useMemo(() => groupCharacters(matching), [matching]);

  const visible = useMemo(
    () => (limit ? characters.slice(0, limit) : characters.slice(0, shown)),
    [characters, limit, shown],
  );

  if (credential === "missing" || error === "gate") return <HeygenGate />;

  return (
    <div>
      {showControls && (
        <>
          <div className="mb-7 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative w-full sm:max-w-[280px]">
              <span className="sr-only">Search {title.toLowerCase()}</span>
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
                  <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} aria-label={v === "grid" ? "Grid view" : "List view"}
                    className={cn("flex h-8 w-9 items-center justify-center rounded-[4px] transition-colors", view === v ? "bg-[var(--composer-chip)] text-[var(--brand)]" : "text-[var(--content-caption)] hover:text-[var(--content-title)]")}>
                    <Icon size={16} strokeWidth={1.75} />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="-mx-4 mb-7 flex h-11 shrink-0 flex-nowrap items-center gap-2 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mb-8 sm:overflow-visible sm:px-0">
        {CHIPS.map((chip) => (
          <button key={chip.key} type="button" onClick={() => setCategory(chip.key)} aria-pressed={category === chip.key}
            className={cn("inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border px-4 text-sm font-medium leading-none transition-colors",
              category === chip.key ? "border-[color-mix(in_oklab,var(--brand)_50%,transparent)] bg-[#eef6fc] text-[#38A1E5] dark:bg-[rgb(15_45_72_/_0.92)] dark:text-[#5ec4ff]" : "border-[var(--border)] bg-[var(--card)] text-[var(--content-title)] hover:bg-[var(--accent)]")}>
            {chip.label}
          </button>
        ))}
      </div>

      {subcategory && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link
            href={`/ai-avatar/my?category=${category}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--content-title)] transition-colors hover:text-[var(--foreground)] sm:text-sm"
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            All {CHIPS.find((c) => c.key === category)?.label ?? "Avatars"}
          </Link>
          <span className="text-xs text-[var(--content-title)] sm:text-sm">·</span>
          <h2 className="text-sm font-semibold text-[var(--content-title)] sm:text-base">
            {subcategory}
          </h2>
        </div>
      )}


      {error === "load" ? (
        <div className="rounded-[9px] border border-[var(--border)] bg-[var(--card)] p-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
          <p role="alert" className="text-sm font-semibold text-[var(--content-title)] sm:text-base">Couldn&apos;t load the avatar catalogue</p>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-[var(--content-caption)] sm:text-[13px]">
            The provider returns an error intermittently on this endpoint. Trying again usually works.
          </p>
          <button type="button" onClick={retry} className="twin-gradient mt-4 h-9 px-4 text-[13px] font-semibold">Try again</button>
        </div>
      ) : loading ? (
        <div className={cn("pb-8 sm:pb-12", variant === "tiles" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4")}>
          {Array.from({ length: limit ?? 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <EmptyInboxArt />
          <p className="text-sm text-[var(--content-title)]">
            {category === "HISTORY" && !query.trim()
              ? subcategory
                ? `No ${subcategory} avatars on this account`
                : "No historical avatars on this account"
              : "No avatars found"}
          </p>
          {category === "HISTORY" && !query.trim() && (
            <p className="mx-auto mt-1 max-w-md text-[13px] text-[var(--content-caption)]">
              HeyGen&apos;s stock catalogue is modern presenters only. Twin&apos;s historical figures are
              custom avatars trained on its own account, so this tab fills up once you add your own.
            </p>
          )}
          {!(category === "HISTORY" && !query.trim()) && (
            <p className="mt-1 text-[13px] text-[var(--content-caption)]">Try another search or category chip.</p>
          )}
        </div>
      ) : view === "grid" ? (
        <div
          className={cn(
            "pb-8 sm:pb-12",
            variant === "tiles"
              ? "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
              : "grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
          )}
        >
          {visible.map((c) =>
            variant === "tiles"
              ? <AvatarTile key={c.name} character={c} onSelect={onSelect} />
              : <CharacterCard key={c.name} character={c} onSelect={onSelect} />,
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)]">
          {visible.map((c) => (
            <li key={c.name}>
              <button type="button" onClick={() => onSelect?.(c.looks[0])} className="flex w-full items-center gap-3 p-3 text-left hover:bg-[var(--canvas-muted)]">
                <span className="h-11 w-11 flex-none overflow-hidden rounded-full bg-[var(--canvas-muted)]">
                  {c.looks[0]?.preview_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.looks[0].preview_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--content-title)]">{c.name}</span>
                  <span className="block truncate text-[12.5px] text-[var(--content-caption)]">
                    {c.looks.length > 1 ? `${c.looks.length} looks` : c.looks[0]?.gender ?? "Avatar"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && matching.length > 0 && !limit && (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-[12.5px] text-[var(--content-caption)]">
            Showing {visible.length} of {matching.length} avatar{matching.length === 1 ? "" : "s"}
          </p>
          {visible.length < matching.length && (
            <button type="button" onClick={() => setShown((n) => n + PAGE)}
              className="h-9 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-5 text-[13px] font-medium text-[var(--content-title)] transition-colors hover:bg-[var(--canvas-muted)]">
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
