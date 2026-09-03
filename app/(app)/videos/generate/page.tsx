"use client";

/** Create Video Clip (teardown §2.5): image → video with a motion prompt. */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Upload } from "lucide-react";

import { HeygenGate } from "@/components/twin/avatar-gallery";
import { useHeygenCredential } from "@/hooks/use-heygen-credential";
import { createVideoClip, uploadHeygenAsset, HeygenCredentialMissingError } from "@/lib/heygen/rest";
import { rememberVideo } from "@/lib/twin/local-library";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { cn } from "@/lib/utils";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const IMAGE_MAX = 30 * 1024 * 1024;

type Ratio = "16:9" | "9:16" | "1:1";
const RATIOS: { value: Ratio; label: string }[] = [
  { value: "16:9", label: "1280 × 720" },
  { value: "9:16", label: "720 × 1280" },
  { value: "1:1", label: "1080 × 1080" },
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

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-7 sm:mb-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.6px] text-[var(--content-title)]">Create Video Clip</h1>
        <p className="mt-1 text-[14px] text-[var(--content-caption)]">Turn a reference image into a short video with a motion prompt.</p>
      </header>

      {credential === "missing" ? (
        <HeygenGate />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
            <h2 className="mb-3 text-[15px] font-semibold text-[var(--content-title)]">Upload Image</h2>
            <div
              onDragOver={(e) => { e.preventDefault(); setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) pick(f); }}
              className={cn("rounded-[var(--radius-card)] border-2 border-dashed p-4 text-center transition-colors", over ? "border-[var(--brand)] bg-[var(--composer-chip)]" : "border-[var(--border)] bg-[var(--composer-well)]")}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Reference preview" className="mx-auto max-h-[280px] w-auto rounded-[var(--radius-control)]" />
              ) : (
                <div className="py-8">
                  <Upload size={22} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--content-caption)]" />
                  <p className="text-[13.5px] font-medium text-[var(--content-title)]">Drag &amp; drop an image, or upload a file</p>
                </div>
              )}
              <button type="button" onClick={() => input.current?.click()} disabled={busy} className="twin-gradient mt-4 h-10 px-4 text-[13px] font-semibold">
                {file ? "Choose another" : "Upload File"}
              </button>
              <p className="mt-3 text-[12px] text-[var(--content-caption)]">Supported formats: JPG, PNG, GIF, WEBP. Max size: 30MB.</p>
              <input ref={input} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
              <label htmlFor="prompt" className="mb-2 block text-[15px] font-semibold text-[var(--content-title)]">Video prompt</label>
              <textarea id="prompt" rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe the video you want to create in detail…"
                className="w-full resize-y rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--composer-well)] p-3 text-[13.5px] text-[var(--content-title)] outline-none placeholder:text-[var(--content-caption)] focus:border-[var(--brand)]" />
            </section>

            <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
              <p className="mb-2 text-[15px] font-semibold text-[var(--content-title)]">Resolution</p>
              <div className="flex flex-wrap gap-2">
                {RATIOS.map((r) => (
                  <button key={r.value} type="button" onClick={() => setRatio(r.value)} aria-pressed={ratio === r.value}
                    className={cn("h-9 rounded-[var(--radius-control)] border px-3 text-[12.5px] transition-colors",
                      ratio === r.value ? "border-transparent bg-[var(--composer-chip)] font-medium text-[var(--brand)]" : "border-[var(--border)] text-[var(--content-title)] hover:bg-[var(--canvas-muted)]")}>
                    {r.label}
                  </button>
                ))}
              </div>
            </section>

            {error && <p role="alert" className="text-[13.5px] text-red-600">{error}</p>}

            <button type="button" onClick={generate} disabled={busy || !file || !prompt.trim()} className="twin-gradient flex h-11 items-center justify-center gap-2 text-[14px] font-semibold">
              <Sparkles size={15} strokeWidth={1.75} /> {busy ? "Generating…" : "Generate Video Clip"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
