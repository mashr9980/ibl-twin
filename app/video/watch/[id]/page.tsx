"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import { getVideo, type HeygenVideo } from "@/lib/heygen/rest";

export default function WatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [video, setVideo] = useState<HeygenVideo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getVideo(id).then(setVideo).catch(() => setError("This video isn't available."));
  }, [id]);

  const date = video?.created_at
    ? new Date(typeof video.created_at === "number" && video.created_at < 1e12 ? video.created_at * 1000 : video.created_at).toLocaleDateString("en-GB")
    : "";

  return (
    <main className="flex min-h-screen flex-col items-center bg-black px-4 py-10 text-white">
      <div className="w-full max-w-[650px]">
        {error ? (
          <p className="text-white/70">{error}</p>
        ) : !video ? (
          <div className="aspect-video animate-pulse rounded-[var(--radius-card)] bg-white/10" />
        ) : (
          <>
            {video.video_url ? (
              <video src={video.video_url} controls autoPlay className="w-full rounded-[var(--radius-card)] bg-black" />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-[var(--radius-card)] bg-white/10 text-white/70">Still generating…</div>
            )}
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[16px] font-semibold">{video.title ?? "Untitled video"}</h1>
                <p className="text-[12.5px] text-white/60">{date}</p>
              </div>
              {video.video_url && (
                <a href={video.video_url} download className="flex items-center gap-1.5 rounded-[var(--radius-control)] border border-white/20 px-3 py-1.5 text-[13px] hover:bg-white/10">
                  <Download size={14} strokeWidth={1.75} /> Download
                </a>
              )}
            </div>
          </>
        )}
      </div>
      <p className="mt-auto pt-10 text-[12.5px] text-white/50">
        Created with <Link href="/" className="text-[var(--brand)] hover:underline">Memorare Twin</Link>
      </p>
    </main>
  );
}
