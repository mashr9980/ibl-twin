"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Play, Search, Square } from "lucide-react";

import { HeygenGate } from "@/components/twin/avatar-gallery";
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

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-7 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[24px] font-semibold tracking-[-0.6px] text-[var(--content-title)]">Voices</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative"><span className="sr-only">Search voices</span>
            <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--content-caption)]" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search voices" className="h-9 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 text-[13.5px] outline-none focus:border-[var(--brand)] sm:w-[240px]" />
          </label>
          <button type="button" disabled title="Coming soon" className="twin-gradient flex h-9 items-center justify-center gap-1.5 px-4 text-[13px] font-semibold"><Mic size={14} /> Clone Voice</button>
        </div>
      </header>

      {credential === "missing" ? <HeygenGate /> : (
        <>
          <section className="mb-8 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center">
            <Mic size={24} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--content-caption)]" />
            <p className="text-[14px] font-medium text-[var(--content-title)]">My Voices</p>
            <p className="mt-1 text-[13px] text-[var(--content-caption)]">No voices yet — clone one or add from pre-built below.</p>
          </section>

          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-[var(--content-title)]">Pre-built Voices</h2>
            <span className="text-[12.5px] text-[var(--content-caption)]">{loading ? "…" : `${matching.length} voices`}</span>
          </div>
          <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)]">
            {loading && Array.from({ length: 6 }).map((_, i) => <li key={i} className="h-14 animate-pulse bg-[var(--canvas-muted)]" />)}
            {!loading && visible.map((v) => (
              <li key={v.voice_id} className="flex items-center gap-3 px-3 py-2.5">
                <button type="button" onClick={() => toggle(v)} disabled={!v.preview_audio} aria-label={playing === v.voice_id ? "Stop" : "Play"} className="twin-gradient flex h-9 w-9 flex-none items-center justify-center rounded-[var(--radius-control)] disabled:opacity-40">
                  {playing === v.voice_id ? <Square size={13} /> : <Play size={13} />}
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium text-[var(--content-title)]">{v.name}</span>
                  <span className="block truncate text-[12px] text-[var(--content-caption)]">{[v.language, v.gender].filter(Boolean).join(" · ")}</span>
                </span>
              </li>
            ))}
          </ul>

          {!loading && matching.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <p className="text-[12.5px] text-[var(--content-caption)]">
                Showing {visible.length} of {matching.length} voice{matching.length === 1 ? "" : "s"}
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
    </div>
  );
}
