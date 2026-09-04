"use client";

/**
 * "Edit Avatar Video" — twin's generation modal (teardown §2.4).
 * Preview · Voice · Script · Voice Speed · Generate.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Maximize,
  Mic,
  Minimize2,
  Play,
  RectangleHorizontal,
  RectangleVertical,
  Volume2,
  X,
} from "lucide-react";

import {
  createVideo,
  listHeygenVoices,
  type HeygenAvatar,
  type HeygenVoice,
  type Orientation,
} from "@/lib/heygen/rest";
import { rememberVideo } from "@/lib/twin/local-library";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { Alert } from "@/components/twin/alert";
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
  // Twin opens with neither orientation pressed and the avatar at its native
  // 4:5; picking one switches both the preview ratio and what we render.
  const [orientation, setOrientation] = useState<Orientation | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
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
    // Twin opens with neither orientation pressed; those renders go landscape.
    const chosen: Orientation = orientation ?? "landscape";
    try {
      const { video_id } = await createVideo({
        avatar_id: avatar.avatar_id,
        voice_id: voiceId,
        script: script.trim(),
        title,
        orientation: chosen,
        speed,
      });
      rememberVideo(resolveAppTenant(), {
        id: video_id,
        title,
        kind: "avatar",
        orientation: chosen,
        avatarName: avatar.avatar_name,
        createdAt: Date.now(),
      });
      router.push("/videos/my?type=avatar");
    } catch {
      setError("Video generation failed. Please try again.");
      setBusy(false);
    }
  }

  // Twin nests two frames: the outer stage keeps 4:5 so the controls never
  // move, and only the inner media box takes the chosen ratio.
  const mediaRatio = orientation === "landscape" ? "16 / 9" : orientation === "portrait" ? "9 / 16" : "4 / 5";
  const stageWidth = orientation
    ? "max-w-[min(100%,260px)] sm:max-w-[min(100%,320px)]"
    : "max-w-[min(100%,360px)] sm:max-w-[min(100%,420px)]";
  const mediaWidth =
    orientation === "portrait"
      ? "max-w-[min(100%,220px)] sm:max-w-[min(100%,260px)]"
      : orientation === "landscape"
        ? "max-w-full"
        : "max-w-[min(100%,360px)] sm:max-w-[min(100%,420px)]";
  const initial = (voice?.name ?? "?").trim().charAt(0).toUpperCase();

  /** Twin's overlay control: 36px on touch, 28px from sm up. */
  const ctl =
    "inline-flex size-9 min-h-9 min-w-9 touch-manipulation items-center justify-center rounded-[5px] border text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--accent)] sm:size-7 sm:min-h-0 sm:min-w-0";
  const ctlOn = "border-[var(--brand)] bg-[var(--card)] ring-1 ring-[color-mix(in_oklab,var(--brand)_30%,transparent)]";
  const ctlOff = "border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_95%,transparent)]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gen-title"
    >
      <button aria-label="Close" onClick={() => !busy && onClose()} className="absolute inset-0" />

      <div className="relative flex max-h-[min(92dvh,calc(100dvh-2rem))] w-[min(calc(100vw-2rem),1040px)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-0 text-[var(--card-foreground)] shadow-md">
        <div className="shrink-0 space-y-0 border-b border-[var(--border)] px-4 py-4 text-left sm:px-6">
          <h2 id="gen-title" className="text-base font-semibold text-[var(--content-title)] sm:text-lg">
            Edit Avatar Video
          </h2>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[minmax(0,1fr)_auto]">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:contents">
            {/* Preview */}
            <div className="flex min-h-[min(220px,40dvh)] flex-col border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] p-4 sm:p-5 lg:row-span-2 lg:min-h-[min(320px,45dvh)] lg:overflow-hidden lg:border-b-0 lg:border-r">
              <div className="flex flex-1 items-center justify-center">
                <div
                  className={cn("relative mx-auto w-full overflow-hidden rounded-lg bg-[var(--muted)]", stageWidth)}
                  style={{ aspectRatio: "4 / 5" }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className={cn("relative w-full overflow-hidden rounded-lg bg-[var(--muted)]", orientation === "landscape" ? "h-auto" : "h-full", mediaWidth)}
                      style={{ aspectRatio: mediaRatio }}
                    >
                      {avatar.preview_image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatar.preview_image_url}
                          alt={avatar.avatar_name}
                          className={cn("absolute inset-0 size-full", fit === "cover" ? "object-cover" : "object-contain")}
                        />
                      )}
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-8">
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"
                      aria-hidden="true"
                    />
                    <div className="relative flex items-center justify-end gap-2">
                      <div className="flex gap-1">
                        <button type="button" aria-label="Cover" aria-pressed={fit === "cover"}
                          onClick={() => setFit("cover")} className={cn(ctl, fit === "cover" ? ctlOn : ctlOff)}>
                          <Maximize className="size-3.5" strokeWidth={1.75} aria-hidden />
                        </button>
                        <button type="button" aria-label="Fit" aria-pressed={fit === "fit"}
                          onClick={() => setFit("fit")} className={cn(ctl, fit === "fit" ? ctlOn : ctlOff)}>
                          <Minimize2 className="size-3.5" strokeWidth={1.75} aria-hidden />
                        </button>
                        <button type="button" aria-label="Landscape" aria-pressed={orientation === "landscape"}
                          onClick={() => setOrientation("landscape")} className={cn(ctl, orientation === "landscape" ? ctlOn : ctlOff)}>
                          <RectangleHorizontal className="size-3.5" strokeWidth={1.75} aria-hidden />
                        </button>
                        <button type="button" aria-label="Portrait" aria-pressed={orientation === "portrait"}
                          onClick={() => setOrientation("portrait")} className={cn(ctl, orientation === "portrait" ? ctlOn : ctlOff)}>
                          <RectangleVertical className="size-3.5" strokeWidth={1.75} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:col-start-2 lg:row-start-1 lg:max-h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
              <div className="flex flex-col gap-5 p-4 sm:gap-6 sm:p-5">
                <section className="space-y-3">
                  <h3 className="text-[13px] font-semibold text-[var(--content-title)] sm:text-sm">Voice</h3>
                  <button type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-[5px] border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] px-4 py-6 transition-colors hover:border-[var(--brand)] hover:bg-[color-mix(in_oklab,var(--composer-chip)_40%,transparent)]">
                    <Mic className="size-5 text-[var(--muted-foreground)]" strokeWidth={1.5} aria-hidden />
                    <span className="text-xs leading-snug text-[var(--content-title)] sm:text-[13px]">
                      Upload or Record Your Voice
                    </span>
                  </button>

                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--content-title)] sm:text-sm">
                      <Volume2 className="size-4 shrink-0 text-[var(--muted-foreground)]" strokeWidth={1.75} aria-hidden />
                      Standard voices
                    </p>

                    <div className="flex min-w-0 items-center gap-2">
                      <div className="relative min-w-0 flex-1">
                        <button type="button" role="combobox" aria-expanded={voiceOpen}
                          aria-label={`Standard voice: ${voice?.name ?? "none selected"}`}
                          disabled={!voices.length} onClick={() => setVoiceOpen((v) => !v)}
                          className="flex h-9 min-h-9 w-full min-w-0 items-center justify-between overflow-hidden rounded-[8px] border border-[var(--input)] bg-[var(--background)] py-1.5 pl-3 pr-2 text-left shadow-sm disabled:cursor-not-allowed disabled:opacity-50">
                          <span className="flex w-full min-w-0 items-center gap-2 overflow-hidden text-left">
                            <span aria-hidden="true"
                              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--composer-chip)] text-[11px] font-semibold leading-none text-[var(--brand)]">
                              {initial}
                            </span>
                            <span title={voice?.name ?? undefined} className="block min-w-0 flex-1 truncate whitespace-nowrap text-left text-xs leading-snug text-[var(--content-title)] sm:text-[13px]">
                              {voice?.name ?? "Loading voices…"}
                            </span>
                          </span>
                          <ChevronDown className="ml-0.5 size-4 shrink-0 opacity-50" strokeWidth={2} aria-hidden />
                        </button>

                        {voiceOpen && (
                          <ul role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-[8px] border border-[var(--border)] bg-[var(--popover)] p-1 shadow-[var(--shadow-popover)]">
                            {voices.map((v) => (
                              <li key={v.voice_id}>
                                <button type="button" role="option" aria-selected={v.voice_id === voiceId}
                                  onClick={() => { setVoiceId(v.voice_id); setVoiceOpen(false); }}
                                  className={cn("block w-full truncate rounded-[5px] px-2 py-1.5 text-left text-[13px] hover:bg-[var(--accent)]",
                                    v.voice_id === voiceId && "bg-[var(--composer-chip)] text-[var(--brand)]")}>
                                  {v.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <button type="button" onClick={togglePreview} disabled={!voice?.preview_audio}
                        aria-label={`Preview ${voice?.name ?? "voice"}`}
                        className="inline-flex size-9 min-h-9 min-w-9 shrink-0 touch-manipulation items-center justify-center rounded-[5px] bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] text-white shadow-[0_2px_6px_rgba(15,23,42,0.1)] transition-[filter] hover:brightness-[0.96] active:brightness-[0.92] disabled:pointer-events-none disabled:opacity-50 sm:size-7 sm:min-h-0 sm:min-w-0">
                        <Play className="relative left-px size-3 fill-white text-white" strokeWidth={0} aria-hidden />
                      </button>
                    </div>

                    <p className="text-[10px] leading-snug text-[var(--content-caption)] sm:text-[11px]">
                      Choose a voice to hear its preview, or tap play again to stop.
                    </p>
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="avatar-script" className="flex items-center gap-0.5 text-[13px] font-semibold text-[var(--content-title)] sm:text-sm">
                      Script<span className="text-[var(--destructive)]" aria-hidden="true">*</span>
                    </label>
                    <button type="button" onClick={() => setScript(SURPRISE[Math.floor(Math.random() * SURPRISE.length)])}
                      className="inline-flex items-center gap-1.5 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] bg-clip-text text-xs font-medium text-transparent transition-opacity hover:opacity-80 sm:text-[13px]">
                      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                        <defs>
                          <linearGradient id="ibl-sparkles-gradient" x1="0" y1="0" x2="24" y2="24">
                            <stop offset="0%" stopColor="#38A1E5" />
                            <stop offset="50%" stopColor="#4DAEE8" />
                            <stop offset="100%" stopColor="#5B6CFF" />
                          </linearGradient>
                        </defs>
                        <path fill="url(#ibl-sparkles-gradient)" d="M12 2l1.2 5.1L18 8.3l-4.8 1.2L12 14l-1.2-4.5L6 8.3l4.8-1.2L12 2zm7 7l.8 3.3L23 13l-3.2.7L19 17l-.8-3.3L15 13l3.2-.7L19 9zM5 15l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4z" />
                      </svg>
                      <span>Surprise me</span>
                    </button>
                  </div>

                  <div className="relative overflow-hidden rounded-md border border-[var(--input)] bg-[color-mix(in_oklab,var(--muted)_30%,transparent)] shadow-xs focus-within:border-[var(--brand)]">
                    <textarea id="avatar-script" value={script} maxLength={SCRIPT_MAX}
                      onChange={(e) => setScript(e.target.value)}
                      placeholder="Add a script or transcript (optional)..."
                      className="flex min-h-[120px] w-full resize-none border-0 bg-transparent px-3 py-2 text-base leading-snug text-[var(--content-title)] shadow-none outline-none placeholder:text-[11px] placeholder:leading-snug placeholder:text-[var(--muted-foreground)] sm:text-[13px] sm:placeholder:text-[13px]" />
                  </div>
                  <p className="mt-1.5 text-[10px] leading-snug text-[var(--content-caption)] sm:text-[11px]">
                    {script.length}/{SCRIPT_MAX}
                  </p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[var(--content-title)] sm:text-sm">Voice Speed</span>
                    <span className="text-xs leading-snug text-[var(--content-title)] sm:text-[13px]">{speed.toFixed(1)}x</span>
                  </div>
                  <input type="range" min={0.5} max={1.5} step={0.1} value={speed} aria-label="Voice speed"
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="twin-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--secondary)]"
                    style={{ ["--pct" as string]: `${((speed - 0.5) / 1) * 100}%` }} />
                  <div className="flex justify-between text-[10px] leading-snug text-[var(--content-caption)] sm:text-[11px]">
                    <span>0.5x</span>
                    <span>1.5x</span>
                  </div>
                </section>

                {error && <Alert onDismiss={() => setError(null)}>{error}</Alert>}
              </div>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col flex-wrap justify-end gap-0 border-t border-[var(--border)] bg-[var(--card)] p-4 sm:flex-col sm:p-5 lg:col-start-2 lg:row-start-2 lg:border-t-0">
            <button type="button" onClick={generate} disabled={busy || !script.trim() || !voiceId} aria-busy={busy}
              className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[5px] border-0 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] px-4 py-2 text-xs font-medium text-white shadow-none transition-all hover:brightness-[0.96] active:brightness-[0.92] disabled:pointer-events-none disabled:opacity-50 sm:h-11 sm:text-[13px]">
              {busy ? "Generating…" : "Generate AI Avatar Video"}
            </button>
          </div>
        </div>

        <button type="button" onClick={() => !busy && onClose()} disabled={busy}
          className="absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none">
          <X className="size-4" strokeWidth={2} aria-hidden />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}
