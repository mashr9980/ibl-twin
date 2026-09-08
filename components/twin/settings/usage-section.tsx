"use client";

// Usage & History: this month's allowance, the workspace's HeyGen balance
// (admins), and the member's own videos.

import Link from "next/link";
import { useEffect, useState } from "react";

import { useHeygenCredits } from "@/hooks/use-heygen-credential";
import { fetchUsage, type AllowanceView } from "@/lib/paywall-client";
import { loadLibrary, type LocalVideo } from "@/lib/twin/local-library";
import { HINT, LABEL, OUTLINE_BTN } from "./ui";

const KIND: Record<LocalVideo["kind"], string> = { twin: "Twin", avatar: "Avatar", clip: "Video Clip" };

export function UsageSection({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const [usage, setUsage] = useState<AllowanceView | null>(null);
  const [videos, setVideos] = useState<LocalVideo[] | null>(null);
  const credits = useHeygenCredits();

  useEffect(() => {
    fetchUsage().then(setUsage).catch(() => setUsage(null));
    loadLibrary().then((l) => setVideos(l.videos)).catch(() => setVideos([]));
  }, []);

  const resets = usage ? new Date(usage.resets_at).toLocaleDateString(undefined, { month: "long", day: "numeric" }) : "";

  return (
    <div className="w-full space-y-8">
      <p className={HINT}>What you have used this month and everything you have made.</p>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <span className={LABEL}>Your plan</span>
          {!usage ? (
            <p className={`${HINT} mt-2`}>Loading…</p>
          ) : usage.tier === "free" && usage.limit !== null ? (
            <>
              <p className="mt-2 text-2xl font-semibold text-[var(--content-title)]">
                {usage.used} <span className="text-base font-normal text-[var(--muted-foreground)]">of {usage.limit} free videos</span>
              </p>
              <p className={`${HINT} mt-1`}>Your free videos return on {resets}.</p>
              <Link href="/join" onClick={onClose} className={`${OUTLINE_BTN} mt-3`}>
                Upgrade for unlimited videos
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 text-2xl font-semibold text-[var(--content-title)]">
                {usage.tier === "admin" ? "Workspace admin" : "Unlimited"}
              </p>
              <p className={`${HINT} mt-1`}>
                {usage.used} video{usage.used === 1 ? "" : "s"} generated this month.
              </p>
            </>
          )}
        </div>

        {isAdmin && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
            <span className={LABEL}>HeyGen credits</span>
            <p className="mt-2 text-2xl font-semibold text-[var(--content-title)]">
              {credits ? credits.remaining : "…"}
              <span className="text-base font-normal text-[var(--muted-foreground)]"> left</span>
            </p>
            <p className={`${HINT} mt-1`}>A twin costs about 1 credit and a video about 1 credit per minute.</p>
            <a href="https://app.heygen.com/settings/billing" target="_blank" rel="noopener noreferrer" className={`${OUTLINE_BTN} mt-3`}>
              Add credits in HeyGen
            </a>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={LABEL}>Your videos</span>
          <Link href="/videos/my" onClick={onClose} className="text-sm text-[var(--brand)] hover:underline">
            Open My Videos
          </Link>
        </div>
        {videos === null ? (
          <p className={HINT}>Loading…</p>
        ) : videos.length === 0 ? (
          <p className={HINT}>Nothing generated yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {videos.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate text-[var(--content-title)]">{v.title || "Untitled video"}</span>
                <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
                  {KIND[v.kind]} · {new Date(v.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
