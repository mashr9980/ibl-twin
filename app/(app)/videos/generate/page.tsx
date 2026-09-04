"use client";

/** Create Video Clip (teardown §2.5): image → video with a motion prompt. */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ImageIcon, Link as LinkIcon, Sparkles, Upload } from "lucide-react";

import { HeygenGate } from "@/components/twin/avatar-gallery";
import { useHeygenCredential } from "@/hooks/use-heygen-credential";
import { createVideoClip, uploadHeygenAsset, HeygenCredentialMissingError } from "@/lib/heygen/rest";
import { rememberVideo } from "@/lib/twin/local-library";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { Alert } from "@/components/twin/alert";
import { cn } from "@/lib/utils";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const IMAGE_MAX = 30 * 1024 * 1024;

type Ratio = "16:9" | "9:16" | "1:1";
const RATIOS: { value: Ratio; label: string }[] = [
  { value: "16:9", label: "1280×768" },
  { value: "9:16", label: "768×1280" },
  { value: "1:1", label: "1080×1080" },
];

export default function CreateVideoClipPage() {
  const router = useRouter();
  const credential = useHeygenCredential();
  const tenant = resolveAppTenant();
  const input = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<Ratio>("16:9");
  // Twin exposes duration as a 5-8s slider; HeyGen takes the number directly.
  const [duration, setDuration] = useState(5);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(f: File) {
    if (!IMAGE_TYPES.includes(f.type)) return setError("Supported formats: JPG, PNG, GIF, WEBP.");
    if (f.size > IMAGE_MAX) return setError("File too large. Max size: 30MB.");
    setError(null);
    setFile(f);
    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }

  async function generate() {
    if (!file || !prompt.trim()) return;
    setBusy(true);
    setError(null);
    const title = prompt.trim().length > 60 ? `${prompt.trim().slice(0, 60)}…` : prompt.trim();
    try {
      const asset = await uploadHeygenAsset(file);
      const { video_id } = await createVideoClip({
        image_asset_id: asset.id,
        motion_prompt: prompt.trim(),
        duration,
        aspect_ratio: ratio,
        title,
      });
      rememberVideo(tenant, {
        id: video_id,
        title,
        kind: "clip",
        orientation: ratio === "9:16" ? "portrait" : "landscape",
        createdAt: Date.now(),
      });
      router.push("/videos/my?type=clip");
    } catch (err) {
      setError(err instanceof HeygenCredentialMissingError ? "HeyGen integration required." : "Video generation failed. Please try again.");
      setBusy(false);
    }
  }

  const OUTLINE =
    "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-xs font-normal text-[var(--content-title)] shadow-none transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 sm:text-[13px]";
  // Same per-action tint twin uses in dark on the Create Twin dropzones.
  const DARK_BLUE =
    "dark:!border-[#4696ED]/55 dark:!bg-[#4696ED]/14 dark:!text-[#4696ED] dark:hover:!border-[#4696ED]/70 dark:hover:!bg-[#4696ED]/22 dark:hover:!text-[#4696ED]";
  const DARK_VIOLET =
    "dark:!border-[#9870FD]/55 dark:!bg-[#9870FD]/14 dark:!text-[#9870FD] dark:hover:!border-[#9870FD]/70 dark:hover:!bg-[#9870FD]/22 dark:hover:!text-[#9870FD]";

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <h1 className="mb-5 text-lg font-semibold tracking-tight text-[var(--content-title)] sm:mb-8 sm:text-xl md:text-2xl">
        Create Video Clip
      </h1>

      {credential === "missing" ? (
        <HeygenGate />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
          <article className="flex flex-col rounded-[9px] border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--card-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
            <h2 className="mb-4 text-[13px] font-semibold text-[var(--content-title)] sm:text-sm">Upload Image</h2>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />

            <div
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) pick(f); }}
              className={cn(
                "flex min-h-[220px] flex-col items-center justify-center rounded-[9px] border border-dashed px-4 py-8 transition-colors sm:min-h-[280px] sm:px-6 sm:py-10",
                over ? "border-[var(--brand)] bg-[var(--composer-chip)]" : "border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] dark:bg-[color-mix(in_oklab,var(--muted)_25%,transparent)]",
              )}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Reference preview" className="max-h-[240px] w-auto rounded-[7px]" />
              ) : (
                <ImageIcon strokeWidth={1.25} aria-hidden className="mb-2.5 size-8 text-[var(--muted-foreground)] sm:mb-3 sm:size-9" />
              )}
              <p className="mb-5 mt-3 text-center text-xs leading-snug text-[var(--muted-foreground)] sm:text-[13px]">
                Drag &amp; drop an image, or upload a file
              </p>
              <div className="flex flex-row flex-wrap items-center justify-center gap-3">
                <button type="button" disabled={busy} onClick={() => input.current?.click()} className={cn(OUTLINE, DARK_BLUE)}>
                  <Upload className="size-4" strokeWidth={1.75} aria-hidden />
                  {file ? "Choose another" : "Upload File"}
                </button>
                <button type="button" disabled className={cn(OUTLINE, DARK_VIOLET)} title="Coming soon">
                  <LinkIcon className="size-4" strokeWidth={1.75} aria-hidden />
                  Enter URL
                </button>
              </div>
            </div>

            <p className="mt-3 text-[10px] leading-snug text-[var(--muted-foreground)] sm:text-[11px]">
              Supported formats: JPG, PNG, GIF, WEBP. Max size: 30MB.
            </p>
          </article>

          <div className="flex min-w-0 flex-col gap-5">
            {/* Twin makes the model a picker; only Veo 3 is offered today. */}
            <button
              type="button"
              aria-haspopup="listbox"
              aria-expanded={false}
              className="relative flex w-full min-w-0 items-start gap-0 rounded-[5px] border border-[var(--border)] bg-[var(--card)] px-4 py-3.5 text-left text-[var(--card-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md"
            >
              <span className="flex w-full min-w-0 items-start gap-3 overflow-hidden pr-8">
                <span aria-hidden="true" className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--card)] ring-1 ring-[var(--border)]">
                  <img src="/images/veo3.png" alt="" width={32} height={32} className="size-8 max-h-8 max-w-8 object-contain" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold leading-snug text-[var(--content-title)] sm:text-sm">Veo 3</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-[var(--content-title)] sm:text-xs">
                    Google&apos;s latest video generation model with cinematic quality, realistic motion, and native audio.
                  </span>
                </span>
              </span>
              <ChevronDown className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" strokeWidth={2} aria-hidden />
            </button>

            <div className="rounded-[9px] border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--card-foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[var(--content-title)] sm:text-[13px]">Video Duration</span>
                <span className="text-xs leading-snug text-[var(--content-title)] sm:text-[13px]">{duration} seconds</span>
              </div>
              <input type="range" min={5} max={8} step={1} value={duration} aria-label="Video duration"
                onChange={(e) => setDuration(Number(e.target.value))}
                className="twin-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--secondary)]"
                style={{ ["--pct" as string]: `${((duration - 5) / 3) * 100}%` }} />
              <div className="mt-2 flex justify-between text-[10px] leading-snug text-[var(--content-caption)] sm:text-[11px]">
                <span>5s</span>
                <span>8s</span>
              </div>
            </div>

            <div className="relative">
              <label htmlFor="video-prompt" className="sr-only">Video prompt</label>
              <textarea id="video-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to create in detail..."
                className="flex min-h-[140px] w-full resize-none rounded-[8px] border border-[var(--input)] bg-[var(--background)] px-4 py-3 pb-14 text-base leading-snug text-[var(--content-title)] shadow-sm outline-none transition-[opacity,box-shadow] placeholder:text-[11px] placeholder:leading-snug placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--brand)] sm:pb-12 sm:text-[13px] sm:placeholder:text-[13px]" />
              <button type="button" disabled
                className="absolute bottom-3 left-3 right-3 z-20 inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-normal text-[var(--foreground)] shadow-none transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 sm:right-auto">
                <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
                Enhance Prompt
              </button>
            </div>

            <div className="relative">
              <label htmlFor="clip-resolution" className="sr-only">Resolution</label>
              <select id="clip-resolution" value={ratio} onChange={(e) => setRatio(e.target.value as Ratio)}
                className="h-11 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 text-base leading-snug text-[var(--content-title)] shadow-sm outline-none sm:text-[13px]">
                {RATIOS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 opacity-50" strokeWidth={2} aria-hidden />
            </div>

            {error && <Alert onDismiss={() => setError(null)}>{error}</Alert>}

            <button type="button" onClick={generate} disabled={busy || !file || !prompt.trim()} aria-busy={busy}
              className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[5px] border-0 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] px-4 py-2 text-xs font-medium text-white shadow-none transition-all hover:brightness-[0.96] active:brightness-[0.92] disabled:pointer-events-none disabled:opacity-50 sm:h-11 sm:text-[13px]">
              <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
              {busy ? "Generating…" : "Generate with Veo 3"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
