"use client";

/**
 * "Edit Avatar Video" — twin's generation modal (teardown §2.4).
 * Preview · Voice · Script · Voice Speed · Generate.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Pause, Play, Sparkles, X } from "lucide-react";

import {
  createVideo,
  listHeygenVoices,
  type HeygenAvatar,
  type HeygenVoice,
  type Orientation,
} from "@/lib/heygen/rest";
import { rememberVideo } from "@/lib/twin/local-library";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { cn } from "@/lib/utils";

const SCRIPT_MAX = 840;

const SURPRISE = [
  "Hi, I'm your AI twin. Today I'll walk you through the three things that make a lesson stick: a clear goal, one worked example, and a question you can't answer without thinking.",
  "Welcome to this week's update. We shipped the new onboarding flow, cut sign-up time in half, and started work on the analytics dashboard. Here's what that means for you.",
  "Let me tell you about the moment everything changed. It wasn't the discovery itself, it was realising that nobody had asked the question before.",
];

/** Twin derives the title; it isn't typed. Avatar + script + voice, 72 chars max. */
export function deriveTitle(avatarName: string, script: string, voiceName: string): string {
  const raw = [avatarName, script.trim(), voiceName].filter(Boolean).join(" · ");
  if (!raw) return "Untitled video";
  return raw.length > 72 ? `${raw.slice(0, 71)}…` : raw;
}

export function GenerateModal({ avatar, onClose }: { avatar: HeygenAvatar; onClose: () => void }) {
  const router = useRouter();
  const [voices, setVoices] = useState<HeygenVoice[]>([]);
  const [voiceId, setVoiceId] = useState("");
  const [script, setScript] = useState("");
  const [speed, setSpeed] = useState(1);
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [fit, setFit] = useState<"cover" | "fit">("cover");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    listHeygenVoices()
      .then((v) => {
        setVoices(v);
        if (v[0]) setVoiceId(v[0].voice_id);
      })
      .catch(() => setError("Couldn't load voices. Please try again."));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const voice = useMemo(() => voices.find((v) => v.voice_id === voiceId), [voices, voiceId]);

  function togglePreview() {
    if (!voice?.preview_audio) return;
    if (!audio.current || audio.current.src !== voice.preview_audio) {
      audio.current?.pause();
      audio.current = new Audio(voice.preview_audio);
      audio.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else {
      void audio.current.play();
      setPlaying(true);
    }
  }

  async function generate() {
    if (!script.trim() || !voiceId) return;
    setBusy(true);
    setError(null);
    const title = deriveTitle(avatar.avatar_name, script, voice?.name ?? "");
    try {
      const { video_id } = await createVideo({
        avatar_id: avatar.avatar_id,
        voice_id: voiceId,
        script: script.trim(),
        title,
        orientation,
        speed,
      });
      rememberVideo(resolveAppTenant(), {
        id: video_id,
        title,
        kind: "avatar",
        orientation,
        avatarName: avatar.avatar_name,
        createdAt: Date.now(),
      });
      router.push("/videos/my?type=avatar");
    } catch {
      setError("Video generation failed. Please try again.");
      setBusy(false);
    }
  }

  const ctl = "h-8 rounded-[var(--radius-control)] border px-3 text-[12.5px] transition-colors";
  const on = "border-transparent bg-[var(--composer-chip)] font-medium text-[var(--brand)]";
  const off = "border-[var(--border)] bg-[var(--card)] text-[var(--content-title)] hover:bg-[var(--canvas-muted)]";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="gen-title">
      <button aria-label="Close" onClick={() => !busy && onClose()} className="absolute inset-0" />
      <div className="relative flex max-h-[95vh] w-full max-w-[960px] flex-col overflow-hidden rounded-t-[var(--radius-pill)] bg-[var(--card)] shadow-[var(--shadow-popover)] sm:rounded-[var(--radius-pill)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h2 id="gen-title" className="text-[16px] font-semibold text-[var(--content-title)]">Edit Avatar Video</h2>
          <button type="button" onClick={() => !busy && onClose()} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--content-caption)] hover:bg-[var(--canvas-muted)]">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
          <div>
            <div className={cn("relative overflow-hidden rounded-[var(--radius-card)] bg-[var(--canvas-muted)]", orientation === "landscape" ? "aspect-video" : "aspect-[9/16] max-h-[380px]")}>
              {avatar.preview_image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar.preview_image_url} alt={`${avatar.avatar_name} preview`} className={cn("h-full w-full", fit === "cover" ? "object-cover" : "object-contain")} />
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setFit("cover")} aria-pressed={fit === "cover"} className={cn(ctl, fit === "cover" ? on : off)}>Cover</button>
              <button type="button" onClick={() => setFit("fit")} aria-pressed={fit === "fit"} className={cn(ctl, fit === "fit" ? on : off)}>Fit</button>
              <span className="mx-1 w-px bg-[var(--border)]" />
              <button type="button" onClick={() => setOrientation("landscape")} aria-pressed={orientation === "landscape"} className={cn(ctl, orientation === "landscape" ? on : off)}>Landscape</button>
              <button type="button" onClick={() => setOrientation("portrait")} aria-pressed={orientation === "portrait"} className={cn(ctl, orientation === "portrait" ? on : off)}>Portrait</button>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <section>
              <p className="mb-2 text-[13px] font-medium text-[var(--content-title)]">Voice</p>
              <button type="button" disabled title="Coming soon" className="mb-2 flex w-full items-center gap-2 rounded-[var(--radius-control)] border border-dashed border-[var(--border)] px-3 py-2.5 text-[13px] text-[var(--content-caption)] disabled:cursor-not-allowed">
                <Mic size={15} strokeWidth={1.75} /> Upload or Record Your Voice
              </button>
              <p className="mb-1.5 text-[12px] text-[var(--content-caption)]">Standard voices</p>
              <div className="flex gap-2">
                <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)} aria-label="Standard voices" disabled={!voices.length}
                  className="h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-[13.5px] text-[var(--content-title)] outline-none focus:border-[var(--brand)]">
                  {!voices.length && <option>Loading voices…</option>}
                  {voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name}{v.language ? ` – ${v.language}` : ""}{v.gender ? `, ${v.gender}` : ""}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={togglePreview} disabled={!voice?.preview_audio} aria-label={playing ? "Pause preview" : "Play preview"}
                  className="flex h-10 w-10 flex-none items-center justify-center rounded-[var(--radius-control)] border border-[var(--border)] text-[var(--content-title)] hover:bg-[var(--canvas-muted)] disabled:opacity-40">
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
              </div>
              <p className="mt-1.5 text-[12px] text-[var(--content-caption)]">Choose a voice to hear its preview.</p>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="script" className="text-[13px] font-medium text-[var(--content-title)]">Script <span className="text-red-500">*</span></label>
                <button type="button" onClick={() => setScript(SURPRISE[Math.floor(Math.random() * SURPRISE.length)])} className="flex items-center gap-1 text-[12.5px] text-[var(--brand)] hover:underline">
                  <Sparkles size={13} strokeWidth={1.75} /> Surprise me
                </button>
              </div>
              <textarea id="script" value={script} maxLength={SCRIPT_MAX} onChange={(e) => setScript(e.target.value)} rows={6} placeholder="Type what your avatar should say…"
                className="w-full resize-y rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--composer-well)] p-3 text-[13.5px] text-[var(--content-title)] outline-none placeholder:text-[var(--content-caption)] focus:border-[var(--brand)]" />
              <p className="mt-1 text-right text-[12px] tabular-nums text-[var(--content-caption)]">{script.length}/{SCRIPT_MAX}</p>
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <label htmlFor="speed" className="font-medium text-[var(--content-title)]">Voice Speed</label>
                <span className="tabular-nums text-[var(--content-title)]">{speed.toFixed(1)}x</span>
              </div>
              <input id="speed" type="range" min={0.5} max={1.5} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
              <div className="flex justify-between text-[11.5px] text-[var(--content-caption)]"><span>0.5x</span><span>1.5x</span></div>
            </section>

            {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}

            <button type="button" onClick={generate} disabled={busy || !script.trim() || !voiceId} className="twin-gradient h-11 w-full text-[14px] font-semibold">
              {busy ? "Generating…" : "Generate AI Avatar Video"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
