"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, Search, UserRound } from "lucide-react";

import {
  HeygenCredentialMissingError,
  invalidateAvatarCatalogue,
  listHeygenAvatars,
  type HeygenAvatar,
} from "@/lib/heygen/rest";
import { useHeygenCredential } from "@/hooks/use-heygen-credential";
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
      <p className="text-[15px] font-medium text-[var(--content-title)]">HeyGen integration required</p>
      <p className="mx-auto mt-1.5 max-w-md text-[13.5px] leading-relaxed text-[var(--content-caption)]">
        This tenant has no HeyGen credential yet. Add one named{" "}
        <code className="rounded bg-[var(--canvas-muted)] px-1 py-0.5 text-[12.5px]">heygen</code> in your
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
  showControls = true,
}: {
  title: string;
  onSelect?: (a: HeygenAvatar) => void;
  /** Render only the first N (used by the Create Twin teaser grid). */
  limit?: number;
  showControls?: boolean;
}) {
  const params = useSearchParams();
  const credential = useHeygenCredential();
  const [avatars, setAvatars] = useState<HeygenAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
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

  // A new search or chip starts from the first page again.
  useEffect(() => setShown(PAGE), [query, category]);

  function retry() {
    invalidateAvatarCatalogue();
    setError(null);
    setReloadKey((k) => k + 1);
  }

  /** Counts per chip, so an empty category reads as empty rather than broken. */
  const counts = useMemo(() => ({
    ALL: avatars.length,
    MODERN: avatars.filter((a) => categoryOf(a) === "MODERN").length,
    HISTORY: avatars.filter((a) => categoryOf(a) === "HISTORY").length,
  }), [avatars]);

  const matching = useMemo(() => {
    const q = query.trim().toLowerCase();
    return avatars.filter(
      (a) => (category === "ALL" || categoryOf(a) === category) && (!q || (a.avatar_name ?? "").toLowerCase().includes(q)),
    );
  }, [avatars, query, category]);

  const visible = useMemo(
    () => (limit ? matching.slice(0, limit) : matching.slice(0, shown)),
    [matching, limit, shown],
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

      <div className="mb-6 flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button key={chip.key} type="button" onClick={() => setCategory(chip.key)} aria-pressed={category === chip.key}
            className={cn("flex h-8 items-center gap-1.5 rounded-[var(--radius-pill)] border px-3.5 text-[13px] transition-colors",
              category === chip.key ? "border-transparent bg-[var(--composer-chip)] font-medium text-[var(--brand)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--content-title)] hover:bg-[var(--canvas-muted)]")}>
            {chip.label}
            {!loading && (
              <span className="tabular-nums text-[11.5px] text-[var(--content-caption)]">{counts[chip.key]}</span>
            )}
          </button>
        ))}
      </div>

      {error === "load" ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-10 text-center">
          <p role="alert" className="text-[14px] font-medium text-[var(--content-title)]">Couldn&apos;t load the avatar catalogue</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-[var(--content-caption)]">
            The provider returns an error intermittently on this endpoint. Trying again usually works.
          </p>
          <button type="button" onClick={retry} className="twin-gradient mt-4 h-9 px-4 text-[13px] font-semibold">Try again</button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: limit ?? 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <UserRound size={28} strokeWidth={1.5} className="mx-auto mb-3 text-[var(--content-caption)]" />
          <p className="text-[14px] font-medium text-[var(--content-title)]">No avatars found</p>
          <p className="mt-1 text-[13px] text-[var(--content-caption)]">Try another search or category chip.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {visible.map((a) => <AvatarCard key={a.avatar_id} avatar={a} onSelect={onSelect} />)}
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)]">
          {visible.map((a) => (
            <li key={a.avatar_id}>
              <button type="button" onClick={() => onSelect?.(a)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-[var(--canvas-muted)]">
                <span className="h-11 w-11 flex-none overflow-hidden rounded-full bg-[var(--canvas-muted)]">
                  {a.preview_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.preview_image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[var(--content-title)]">{a.avatar_name}</span>
                  <span className="block truncate text-[12.5px] text-[var(--content-caption)]">{a.gender ?? "Avatar"}</span>
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
