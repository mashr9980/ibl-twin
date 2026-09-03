"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, Search, UserRound } from "lucide-react";

import {
  HeygenCredentialMissingError,
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
      .catch((err) => !cancelled && setError(err instanceof HeygenCredentialMissingError ? "gate" : "Couldn't load avatars. Please try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [credential]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = avatars.filter((a) => (category === "ALL" || categoryOf(a) === category) && (!q || (a.avatar_name ?? "").toLowerCase().includes(q)));
    return limit ? list.slice(0, limit) : list;
  }, [avatars, query, category, limit]);

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
            className={cn("h-8 rounded-[var(--radius-pill)] border px-3.5 text-[13px] transition-colors",
              category === chip.key ? "border-transparent bg-[var(--composer-chip)] font-medium text-[var(--brand)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--content-title)] hover:bg-[var(--canvas-muted)]")}>
            {chip.label}
          </button>
        ))}
      </div>

      {error && error !== "gate" && <p role="alert" className="mb-4 text-[13.5px] text-red-600">{error}</p>}

      {loading ? (
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

      {!loading && visible.length > 0 && !limit && (
        <p className="mt-6 text-[12.5px] text-[var(--content-caption)]">{visible.length} avatar{visible.length === 1 ? "" : "s"}</p>
      )}
    </div>
  );
}
