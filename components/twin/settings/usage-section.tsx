"use client";

// Usage & History, laid out as twin.memorare.ai's: a meter per thing the app
// makes, then everything this member has generated. The numbers come from
// this app's own allowance and library.

import { useEffect, useState } from "react";
import { Clock, Download, ImagePlay, Info, ScanFace, CircleUserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { useHeygenCredits } from "@/hooks/use-heygen-credential";
import { fetchUsage, type AllowanceView } from "@/lib/paywall-client";
import { loadLibrary, type LocalVideo } from "@/lib/twin/local-library";
import { cn } from "@/lib/utils";
import { CARD, OUTLINE_BTN, PRIMARY_BTN } from "./ui";

/** A meter card: icon, name, an explanation behind the info button, and a bar. */
function Meter({
  icon: Icon,
  name,
  about,
  used,
  total,
  segments,
  action,
}: {
  icon: LucideIcon;
  name: string;
  about: string;
  used: number;
  total: number | null;
  segments?: boolean;
  action?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pct = total ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <div className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-[var(--muted-foreground)]" strokeWidth={1.75} aria-hidden />
          <span className="text-sm font-medium text-[var(--foreground)]">{name}</span>
          <div className="relative inline-flex items-center justify-center">
            <button
              type="button"
              aria-label={`About ${name}`}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
            >
              <Info className="size-3.5" strokeWidth={1.75} aria-hidden />
            </button>
            {open && (
              <span className="absolute left-1/2 top-6 z-20 w-56 -translate-x-1/2 rounded-[8px] border border-[var(--border)] bg-[var(--popover)] px-3 py-2 text-xs leading-snug text-[var(--foreground)] shadow-[var(--shadow-popover)]">
                {about}
              </span>
            )}
          </div>
        </div>
        {action}
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm text-[var(--muted-foreground)]">
          <span>Total used</span>
          <span className="tabular-nums text-[var(--foreground)]">{total === null ? used : `${used} / ${total}`}</span>
        </div>
        {segments && total ? (
          <div className="flex gap-1">
            {Array.from({ length: total }, (_, i) => (
              <div key={i} className="h-2 flex-1 overflow-hidden rounded-[8px] bg-[var(--muted)]">
                <div className="h-full rounded-full bg-[color-mix(in_oklab,var(--muted-foreground)_35%,transparent)] transition-all" style={{ width: i < used ? "100%" : "0%" }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-2 w-full overflow-hidden rounded-[8px] bg-[var(--muted)]">
            <div className="h-full rounded-full bg-[color-mix(in_oklab,var(--muted-foreground)_35%,transparent)] transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}

const KIND: Record<LocalVideo["kind"], string> = { twin: "Twin video", avatar: "Avatar video", clip: "Video clip" };

export function UsageSection({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const [usage, setUsage] = useState<AllowanceView | null>(null);
  const [videos, setVideos] = useState<LocalVideo[] | null>(null);
  const [hasTwin, setHasTwin] = useState(false);
  const credits = useHeygenCredits();

  useEffect(() => {
    fetchUsage().then(setUsage).catch(() => setUsage(null));
    loadLibrary()
      .then((l) => {
        setVideos(l.videos);
        setHasTwin(!!l.twin);
      })
      .catch(() => setVideos([]));
  }, []);

  const free = usage?.tier === "free" ? usage : null;

  function download() {
    const rows = [["Project", "Kind", "Created", "Credits"], ...(videos ?? []).map((v) => [
      (v.title || "Untitled").replaceAll('"', "'"),
      KIND[v.kind],
      new Date(v.createdAt).toISOString().slice(0, 10),
      "1",
    ])];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "memorare-twin-history.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-full">
      <div className="space-y-4">
        <Meter
          icon={CircleUserRound}
          name="Digital Twin"
          about="Your own twin, made from a photo or a video. One per account; a new upload replaces it."
          used={hasTwin ? 1 : 0}
          total={1}
          action={
            free ? (
              <Link href="/join" onClick={onClose} className={PRIMARY_BTN}>
                Upgrade
              </Link>
            ) : undefined
          }
        />

        <Meter
          icon={ScanFace}
          name="Videos this month"
          about={
            free
              ? `The free plan includes ${free.limit} videos a month. It resets on ${new Date(free.resets_at).toLocaleDateString(undefined, { day: "numeric", month: "long" })}.`
              : "You generate without a monthly limit; each video spends the workspace's HeyGen credits."
          }
          used={usage?.used ?? 0}
          total={free?.limit ?? null}
          segments={!!free?.limit && free.limit <= 6}
        />

        {isAdmin && (
          <Meter
            icon={ImagePlay}
            name="Workspace credits"
            about="HeyGen credits left for this workspace. A twin costs about 1 credit and a video about 1 credit per minute."
            used={credits?.remaining ?? 0}
            total={null}
          />
        )}

        <div className={CARD}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-[var(--muted-foreground)]" strokeWidth={1.75} aria-hidden />
              <span className="text-sm font-medium text-[var(--foreground)]">History</span>
            </div>
            <button type="button" onClick={download} disabled={!videos?.length} className={cn(OUTLINE_BTN, "gap-2")}>
              <Download className="size-4" strokeWidth={1.75} aria-hidden />
              Download
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-b border-[var(--border)] pb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
            <span>Project</span>
            <span className="text-right">Credits</span>
          </div>

          {videos === null ? (
            <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">Loading…</p>
          ) : videos.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--muted-foreground)]">No video history to show!</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {videos.map((v) => (
                <li key={v.id} className="grid grid-cols-2 gap-2 py-2.5 text-sm">
                  <span className="min-w-0 truncate text-[var(--foreground)]" title={v.title}>
                    {v.title || "Untitled"}
                  </span>
                  <span className="text-right tabular-nums text-[var(--muted-foreground)]">1</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
