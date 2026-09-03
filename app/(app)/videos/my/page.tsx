"use client";

/** My Videos (teardown §2.6): chips, live status polling, player modal. */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clapperboard, Play, Trash2, X } from "lucide-react";

import { HeygenGate } from "@/components/twin/avatar-gallery";
import { useHeygenCredential } from "@/hooks/use-heygen-credential";
import { deleteVideo, getVideo, listVideos, type HeygenVideo } from "@/lib/heygen/rest";
import { forgetVideo, listLocalVideos, type VideoKind } from "@/lib/twin/local-library";
import { resolveAppTenant } from "@/lib/iblai/tenant";
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
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-7 sm:mb-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.6px] text-[var(--content-title)]">My Videos</h1>
        <p className="mt-1 text-[14px] text-[var(--content-caption)]">Create stunning videos using our AI-powered generation.</p>
      </header>

      {credential === "missing" ? (
        <HeygenGate />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {CHIPS.map((c) => (
              <Link key={c.key} href={c.key === "all" ? "/videos/my" : `/videos/my?type=${c.key}`} aria-current={chip === c.key ? "page" : undefined}
                className={cn("h-8 rounded-[var(--radius-pill)] border px-3.5 text-[13px] leading-8 transition-colors",
                  chip === c.key ? "border-transparent bg-[var(--composer-chip)] font-medium text-[var(--brand)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--content-title)] hover:bg-[var(--canvas-muted)]")}>
                {c.label}
              </Link>
            ))}
            {generating > 0 && (
              <span className="ml-auto rounded-[var(--radius-pill)] bg-[var(--composer-chip)] px-3 py-1 text-[12.5px] font-medium text-[var(--brand)]">
                +{generating} more generating
              </span>
            )}
          </div>

          {error && <p role="alert" className="mb-4 text-[13.5px] text-red-600">{error}</p>}

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="aspect-video animate-pulse rounded-[var(--radius-card)] bg-[var(--canvas-muted)]" />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center">
              <Clapperboard size={28} strokeWidth={1.5} className="mx-auto mb-3 text-[var(--content-caption)]" />
              <p className="text-[14px] text-[var(--content-title)]">{empty}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {visible.map((v) => {
                const done = v.status === "completed";
                return (
                  <article key={v.id} className="group relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
                    <button type="button" onClick={() => done && setOpen(v)} disabled={!done} className="block w-full text-left">
                      <div className="relative aspect-video bg-[var(--canvas-muted)]">
                        {v.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center"><Clapperboard size={22} className="text-[var(--content-caption)]" /></div>
                        )}
                        {done ? (
                          <div className="absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex"><span className="flex items-center gap-1.5 text-[13px] font-medium text-white"><Play size={14} /> Click to Play</span></div>
                        ) : (
                          <span
                            title={isStale(v) ? "This render has been pending for hours and is unlikely to finish." : undefined}
                            className={cn(
                              "absolute left-2 top-2 rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-medium text-white",
                              v.status === "failed" ? "bg-red-500" : isStale(v) ? "bg-[var(--content-caption)]" : "bg-[var(--brand)]",
                            )}
                          >
                            {v.status === "failed" ? "Failed" : isStale(v) ? "Stalled" : "Generating…"}
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="line-clamp-2 text-[13.5px] font-medium text-[var(--content-title)]">{v.localTitle ?? v.title ?? "Untitled video"}</p>
                        <p className="mt-1 text-[12px] text-[var(--content-caption)]">{fmtDate(v.created_at)}</p>
                      </div>
                    </button>
                    <button type="button" onClick={() => remove(v)} aria-label="Delete video"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] bg-white/90 text-[var(--content-title)] shadow sm:hidden sm:group-hover:flex">
                      <Trash2 size={14} strokeWidth={1.75} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={open.localTitle ?? open.title ?? "Video"}>
          <button aria-label="Close" onClick={() => setOpen(null)} className="absolute inset-0" />
          <div className="relative w-full max-w-[900px]">
            <div className="mb-3 flex items-start justify-between gap-4 text-white">
              <div><p className="text-[15px] font-medium">{open.localTitle ?? open.title}</p><p className="text-[12.5px] text-white/70">{fmtDate(open.created_at)}</p></div>
              <div className="flex items-center gap-2">
                <Link href={`/video/watch/${open.id}`} className="text-[12.5px] text-white/80 hover:underline">Share</Link>
                <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] hover:bg-white/10"><X size={16} /></button>
              </div>
            </div>
            {open.video_url ? <video src={open.video_url} controls autoPlay className="w-full rounded-[var(--radius-card)] bg-black" /> : <p className="text-white/70">No playable file yet.</p>}
          </div>
        </div>
      )}
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
