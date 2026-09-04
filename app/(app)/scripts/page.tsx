"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MoreHorizontal, Play, Search, Square, Waves } from "lucide-react";

import { HeygenGate } from "@/components/twin/avatar-gallery";
import { cn } from "@/lib/utils";
import { useHeygenCredential } from "@/hooks/use-heygen-credential";
import { listHeygenVoices, type HeygenVoice } from "@/lib/heygen/rest";

/** 3,169 voices is ~22k DOM nodes. Same page-at-a-time rule as the gallery. */
const PAGE = 60;

export default function VoicesPage() {
  const credential = useHeygenCredential();
  const [voices, setVoices] = useState<HeygenVoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (credential !== "ok") { if (credential === "missing") setLoading(false); return; }
    listHeygenVoices().then(setVoices).finally(() => setLoading(false));
  }, [credential]);

  const matching = useMemo(
    () => voices.filter((v) => !q || (v.name ?? "").toLowerCase().includes(q.toLowerCase())),
    [voices, q],
  );
  const visible = useMemo(() => matching.slice(0, shown), [matching, shown]);

  useEffect(() => setShown(PAGE), [q]);

  function toggle(v: HeygenVoice) {
    if (!v.preview_audio) return;
    if (playing === v.voice_id) { audio.current?.pause(); setPlaying(null); return; }
    audio.current?.pause();
    audio.current = new Audio(v.preview_audio);
    audio.current.onended = () => setPlaying(null);
    void audio.current.play();
    setPlaying(v.voice_id);
  }

  /**
   * Twin tints each voice swatch, so a long list still scans. HeyGen gives no
   * colour, so derive one from the voice id: stable per voice, no state.
   */
  const swatch = (id: string) => {
    const palette = [
      "from-blue-300 to-sky-600",
      "from-sky-300 to-sky-600",
      "from-indigo-300 to-indigo-600",
      "from-violet-300 to-violet-600",
      "from-cyan-300 to-cyan-600",
      "from-teal-300 to-teal-600",
    ];
    let sum = 0;
    for (const ch of id) sum = (sum + ch.charCodeAt(0)) % 997;
    return palette[sum % palette.length];
  };

  /** Twin shows a flag beside the accent; map the languages HeyGen returns. */
  const FLAGS: Record<string, string> = {
    english: "🇺🇸", spanish: "🇪🇸", french: "🇫🇷", german: "🇩🇪", italian: "🇮🇹",
    portuguese: "🇵🇹", japanese: "🇯🇵", korean: "🇰🇷", chinese: "🇨🇳", hindi: "🇮🇳",
    arabic: "🇸🇦", dutch: "🇳🇱", polish: "🇵🇱", russian: "🇷🇺", turkish: "🇹🇷",
  };
  const flagOf = (lang?: string | null) => FLAGS[(lang ?? "").toLowerCase()] ?? "🌐";

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <header className="mb-5 flex shrink-0 flex-col gap-3 sm:mb-8 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <h1 className="text-lg font-semibold tracking-tight text-[var(--content-title)] sm:text-xl md:text-2xl">Voices</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <div className="relative w-full sm:w-[280px]">
            <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search voices"
              aria-label="Search voices"
              className="flex h-9 w-full min-w-0 rounded-md border border-[var(--border)] bg-[var(--background)] py-2 pl-9 pr-3 text-base leading-snug text-[var(--content-title)] shadow-sm outline-none placeholder:text-[11px] placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--brand)] sm:text-[13px] sm:placeholder:text-[13px]"
            />
          </div>
          <button
            type="button"
            disabled
            title="Voice cloning isn't available in this build"
            className="inline-flex h-8 w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-[5px] border-0 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] px-3 py-2 text-xs font-medium text-white shadow-none transition-all hover:brightness-[0.96] disabled:pointer-events-none disabled:opacity-50 sm:h-9 sm:w-auto sm:px-4 sm:text-[13px]"
          >
            <Waves className="size-4" strokeWidth={1.75} aria-hidden />
            Clone Voice
          </button>
        </div>
      </header>

      {credential === "missing" ? (
        <HeygenGate />
      ) : (
        <>
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-semibold text-[var(--content-title)] sm:text-base">My Voices</h2>
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[9px] border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] dark:bg-[color-mix(in_oklab,var(--muted)_25%,transparent)] px-4 py-10 sm:min-h-[200px] sm:px-6 sm:py-12">
              <Waves size={32} strokeWidth={1.25} className="mb-3 text-[var(--muted-foreground)]" />
              <p className="mb-5 max-w-md text-center text-[10px] leading-snug text-[var(--content-caption)] sm:text-[11px]">
                No voices yet — clone one or add from pre-built below
              </p>
              <button
                type="button"
                disabled
                title="Voice cloning isn't available in this build"
                className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-normal text-[var(--content-title)] shadow-sm transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 sm:text-[13px]"
              >
                <Waves className="size-4" strokeWidth={1.75} aria-hidden />
                Clone your voice
              </button>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-[var(--content-title)] sm:text-base">Pre-built Voices</h2>
              <span className="inline-flex items-center gap-2 text-xs leading-snug text-[var(--content-title)] sm:text-[13px]">
                {loading ? "…" : `${matching.length} voices`}
              </span>
            </div>

            <div className="rounded-[9px] border border-[var(--border)] bg-[var(--card)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-[76px] animate-pulse border-b border-[var(--border)] last:border-b-0 bg-[var(--canvas-muted)]" />
                ))}

              {!loading &&
                visible.map((v) => (
                  <div key={v.voice_id} className="flex flex-col gap-3 border-b border-[var(--border)] px-3 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`Preview ${v.name ?? "voice"}`}
                      onClick={() => toggle(v)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(v); } }}
                      className="flex min-w-0 flex-1 cursor-pointer touch-manipulation items-start gap-3"
                    >
                      <span className={cn("relative flex size-10 shrink-0 items-center justify-center rounded-[5px] bg-gradient-to-br text-white transition-shadow sm:size-12", swatch(v.voice_id))}>
                        <span className="relative z-10 flex items-center justify-center">
                          {playing === v.voice_id ? <Square size={14} className="fill-white" /> : <Play size={14} className="fill-white" strokeWidth={0} />}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-xs font-semibold text-[var(--content-title)] sm:text-[13px]">{v.name}</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-[var(--content-title)] sm:text-xs">
                          {[v.gender, v.language && `${v.language} accent`].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-[60px] sm:pl-0">
                      <div className="flex items-center gap-1.5 text-[11px] leading-snug text-[var(--content-title)] sm:text-xs">
                        <span className="text-base leading-none" aria-hidden="true">{flagOf(v.language)}</span>
                        <span>{v.language ?? "Unknown"}</span>
                      </div>
                      <span className="text-[11px] leading-snug text-[var(--content-title)] sm:text-xs">
                        {String(v.is_cloneable) === "True" || v.is_cloneable === true ? "Cloneable" : "Standard"}
                      </span>
                      <div className="ml-auto flex shrink-0 items-center gap-1 sm:ml-0">
                        <button
                          type="button"
                          aria-label={`More options for ${v.name ?? "voice"}`}
                          className="inline-flex size-11 min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] sm:size-8 sm:min-h-0 sm:min-w-0"
                        >
                          <MoreHorizontal size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {!loading && visible.length < matching.length && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className="inline-flex h-9 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-5 text-[13px] font-normal text-[var(--content-title)] transition-colors hover:bg-[var(--accent)]"
                >
                  Load more
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
