"use client";

/** My Videos (teardown §2.6): chips, live status polling, player modal. */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clapperboard, Play, Trash2, X } from "lucide-react";

import { EmptyInboxArt, YoutubeGradientIcon } from "@/components/twin/nav-icons";
import { ShareDialog } from "@/components/twin/share-dialog";

import { HeygenGate } from "@/components/twin/avatar-gallery";
import { useHeygenCredential } from "@/hooks/use-heygen-credential";
import { deleteVideo, getVideo, listVideos, type HeygenVideo } from "@/lib/heygen/rest";
import { forgetVideo, listLocalVideos, type VideoKind } from "@/lib/twin/local-library";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { Alert } from "@/components/twin/alert";
import { cn } from "@/lib/utils";

type Chip = "all" | VideoKind;
const CHIPS: { key: Chip; label: string }[] = [
  { key: "all", label: "All" },
  { key: "twin", label: "Twin" },
  { key: "avatar", label: "Avatar" },
  { key: "clip", label: "Video Clips" },
];
const POLL_MS = 5000;
/**
 * A render that has sat pending for hours is not coming back — this account
 * has one stuck since 3,300 hours ago. Without a cutoff the poller chases it
 * forever and the "+N generating" chip never clears. Twin applies the same
 * three-hour rule.
 */
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

type Row = HeygenVideo & { kind: VideoKind; localTitle?: string };

function fmtDate(v: HeygenVideo["created_at"]): string {
  if (!v) return "";
  const d = typeof v === "number" ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB");
}

const isDone = (s: string) => s === "completed" || s === "failed";

function createdAtMs(v: HeygenVideo["created_at"]): number | null {
  if (!v) return null;
  const ms = typeof v === "number" ? (v < 1e12 ? v * 1000 : v) : Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/** Pending, and old enough that it will never resolve. */
function isStale(v: HeygenVideo): boolean {
  if (isDone(v.status)) return false;
  const ms = createdAtMs(v.created_at);
  return ms !== null && Date.now() - ms > STALE_AFTER_MS;
}

function MyVideosInner() {
  const params = useSearchParams();
  const credential = useHeygenCredential();
  const tenant = resolveAppTenant();
  const chip = (params.get("type") as Chip | null) ?? "all";

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Row | null>(null);
  // Twin opens a share dialog here rather than navigating to the watch page.
  const [shareFor, setShareFor] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const local = new Map(listLocalVideos(tenant).map((v) => [v.id, v]));
    const { data } = await listVideos({ limit: 100 });
    setRows(
      data.map((v) => {
        const l = local.get(v.id);
        return { ...v, kind: l?.kind ?? "avatar", localTitle: l?.title };
      }),
    );
  }, [tenant]);

  useEffect(() => {
    if (credential !== "ok") {
      if (credential === "missing") setLoading(false);
      return;
    }
    let cancelled = false;
    load()
      .catch(() => !cancelled && setError("Couldn't load your videos. Please try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [credential, load]);

  // Poll only the rows still rendering; stop touching the ones that resolved.
  useEffect(() => {
    const pending = rows.filter((r) => !isDone(r.status) && !isStale(r));
    if (!pending.length) return;
    const t = setInterval(async () => {
      const fresh = await Promise.all(pending.map((r) => getVideo(r.id).catch(() => null)));
      setRows((prev) => prev.map((r) => {
        const f = fresh.find((x) => x?.id === r.id);
        return f ? { ...r, ...f } : r;
      }));
    }, POLL_MS);
    return () => clearInterval(t);
  }, [rows]);

  const visible = useMemo(() => (chip === "all" ? rows : rows.filter((r) => r.kind === chip)), [rows, chip]);
  const generating = rows.filter((r) => !isDone(r.status) && !isStale(r)).length;

  async function remove(row: Row) {
    if (!confirm("Delete this video?")) return;
    setRows((p) => p.filter((r) => r.id !== row.id));
    forgetVideo(tenant, row.id);
    await deleteVideo(row.id).catch(() => setError("Couldn't delete that video."));
  }

  const empty =
    chip === "twin" ? "No twin. Use Create Twin to make your twin videos." : "No videos in this category yet.";

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <header className="mb-5 flex shrink-0 flex-col gap-3 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--content-title)] sm:text-xl md:text-2xl">My Videos</h1>
          <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[var(--content-title)] sm:mt-2 sm:text-[13px] md:text-sm">
            Create stunning videos using our AI-powered generation.
          </p>
        </div>
        {/* Twin imports YouTube links here; we have no importer, so it's shown
            disabled rather than pretending to work. */}
        <button
          type="button"
          disabled
          title="Not available in this build"
          className="inline-flex h-9 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-normal text-[var(--content-title)] shadow-sm transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 sm:w-auto sm:shrink-0 sm:text-[13px]"
        >
          <YoutubeGradientIcon className="size-4 shrink-0" />
          Add YouTube
        </button>
      </header>

      {credential === "missing" ? (
        <HeygenGate />
      ) : (
        <>
          <div className="-mx-4 mb-7 flex h-11 shrink-0 flex-nowrap items-center gap-2 overflow-x-auto px-4 [-ms-overflow-style:none] [overflow-anchor:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mb-8 sm:overflow-visible sm:px-0">
            {CHIPS.map((c) => (
              <Link
                key={c.key}
                href={c.key === "all" ? "/videos/my" : `/videos/my?type=${c.key}`}
                aria-current={chip === c.key ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center justify-center rounded-[8px] border px-4 text-sm font-medium leading-none transition-colors",
                  chip === c.key
                    ? "border-[color-mix(in_oklab,var(--brand)_50%,transparent)] bg-[#eef6fc] text-[#38A1E5] dark:bg-[rgb(15_45_72_/_0.92)] dark:text-[#5ec4ff]"
                    : "border-[var(--border)] bg-[var(--card)] text-[var(--content-title)] hover:bg-[var(--accent)]",
                )}
              >
                {c.label}
              </Link>
            ))}
            {generating > 0 && (
              <span className="ml-auto shrink-0 rounded-[var(--radius-pill)] bg-[var(--composer-chip)] px-3 py-1 text-[12.5px] font-medium text-[var(--brand)]">
                +{generating} more generating
              </span>
            )}
          </div>

          {error && <Alert className="mb-4" onDismiss={() => setError(null)}>{error}</Alert>}

          <div className="space-y-4 pb-4 [overflow-anchor:none]">
          <section>
          {chip !== "all" && (
            <h2 className="mb-2 text-sm font-semibold text-[var(--content-title)] sm:text-base">
              {CHIPS.find((c) => c.key === chip)?.label}
            </h2>
          )}
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-video animate-pulse rounded-[var(--radius-card)] bg-[var(--canvas-muted)]" />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <EmptyInboxArt />
              <p className="text-sm text-[var(--content-title)]">{empty}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
              {visible.map((v) => {
                const done = v.status === "completed";
                return (
                  <article
                    key={v.id}
                    className="group flex flex-col overflow-hidden rounded-[9px] border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--muted-foreground)_35%,transparent)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.1)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
                  >
                    {/* Twin sets the thumbnail well almost black so letterboxed
                        renders don't glow against the card. */}
                    <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#0f172a]">
                      <button
                        type="button"
                        onClick={() => done && setOpen(v)}
                        disabled={!done}
                        aria-label={`Play ${v.localTitle ?? v.title ?? "video"}`}
                        className="relative block size-full cursor-pointer text-left disabled:cursor-default"
                      >
                        {v.thumbnail_url && (
                          <div className="absolute inset-0">
                            <img src={v.thumbnail_url} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]" />
                          </div>
                        )}
                        {done && (
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100" aria-hidden="true">
                            <span className="flex size-9 items-center justify-center rounded-full bg-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.25)] ring-1 ring-white/35 backdrop-blur-[2px] transition-transform duration-200 group-hover:scale-105">
                              <Play size={14} className="fill-white text-white" strokeWidth={0} />
                            </span>
                            <span className="mt-1.5 px-2 text-center text-[10px] font-semibold leading-snug text-white sm:text-[11px]">Click to Play</span>
                          </div>
                        )}
                      </button>

                      {!done && (
                        <span
                          title={isStale(v) ? "This render has been pending for hours and is unlikely to finish." : undefined}
                          className={cn(
                            "pointer-events-none absolute bottom-2 left-2 z-20 rounded-[5px] px-1.5 py-0.5 text-[9px] font-medium leading-none text-white sm:text-[10px]",
                            v.status === "failed" ? "bg-red-500" : isStale(v) ? "bg-[var(--content-caption)]" : "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)]",
                          )}
                        >
                          {v.status === "failed" ? "Failed" : isStale(v) ? "Stalled" : "Generating…"}
                        </span>
                      )}

                      <div className="absolute right-1.5 top-1.5 z-20 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => remove(v)}
                          aria-label={`Delete video ${v.localTitle ?? v.title ?? ""}`}
                          className="inline-flex size-7 items-center justify-center rounded-[5px] bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] text-white opacity-100 shadow-[0_2px_8px_rgba(15,23,42,0.18)] transition-all duration-200 hover:scale-105 hover:brightness-[0.96] active:brightness-[0.92] sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Trash2 size={14} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>

                    <div className="px-2.5 py-2">
                      <h2 className="line-clamp-2 text-xs font-semibold text-[var(--content-title)] transition-colors duration-200 group-hover:text-[var(--brand)] sm:text-[13px]">
                        {v.localTitle ?? v.title ?? "Untitled video"}
                      </h2>
                      <p className="mt-0.5 text-[10px] leading-snug text-[var(--muted-foreground)] sm:text-[11px]">{fmtDate(v.created_at)}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          </section>
          </div>
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={open.localTitle ?? open.title ?? "Video"}>
          <button aria-label="Close" onClick={() => setOpen(null)} className="absolute inset-0" />
          <div className="relative w-full max-w-[900px]">
            <div className="mb-3 flex items-start justify-between gap-4 text-white">
              <div><p className="text-[15px] font-medium">{open.localTitle ?? open.title}</p><p className="text-[12.5px] text-white/70">{fmtDate(open.created_at)}</p></div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setShareFor(open)} className="text-[12.5px] text-white/80 hover:underline">Share</button>
                <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] hover:bg-white/10"><X size={16} /></button>
              </div>
            </div>
            {open.video_url ? <video src={open.video_url} controls autoPlay className="w-full rounded-[var(--radius-card)] bg-black" /> : <p className="text-white/70">No playable file yet.</p>}
          </div>
        </div>
      )}
      <ShareDialog
        open={!!shareFor}
        onClose={() => setShareFor(null)}
        videoId={shareFor?.id ?? ""}
        title={shareFor?.localTitle ?? shareFor?.title}
      />
    </div>
  );
}

export default function MyVideosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[13.5px] text-[var(--content-caption)]">Loading…</div>}>
      <MyVideosInner />
    </Suspense>
  );
}
