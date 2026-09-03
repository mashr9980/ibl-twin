"use client";

/**
 * Create Twin — twin.memorare.ai's home screen (teardown §2.1).
 * Photo or video → HeyGen photo-avatar group → trained twin, one per account.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Link as LinkIcon, Upload } from "lucide-react";

import { AvatarGallery, HeygenGate } from "@/components/twin/avatar-gallery";
import { GenerateModal } from "@/components/twin/generate-modal";
import { useHeygenCredential } from "@/hooks/use-heygen-credential";
import {
  createPhotoAvatarGroup,
  finalizeAndTrain,
  uploadHeygenAsset,
  HeygenCredentialMissingError,
  type HeygenAvatar,
} from "@/lib/heygen/rest";
import { getLocalTwin, setLocalTwin } from "@/lib/twin/local-library";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { cn } from "@/lib/utils";

const PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const PHOTO_MAX = 10 * 1024 * 1024;
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const VIDEO_MAX = 100 * 1024 * 1024;

/** Twin trains from a still, so a video upload contributes its first clear frame. */
async function firstFrame(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise<void>((res, rej) => {
      video.onloadeddata = () => res();
      video.onerror = () => rej(new Error("Could not read that video."));
    });
    video.currentTime = Math.min(1, video.duration / 2 || 0);
    await new Promise<void>((res) => (video.onseeked = () => res()));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    return await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not capture a frame."))), "image/jpeg", 0.92),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function Dropzone({
  title,
  badge,
  helper,
  accept,
  buttonLabel,
  onFile,
  onUrl,
  disabled,
}: {
  title: string;
  badge?: string;
  helper: string;
  accept: string;
  buttonLabel: string;
  onFile: (f: File) => void;
  onUrl?: (u: string) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  function submitUrl() {
    if (!/^https?:\/\/\S+$/i.test(url.trim())) {
      setUrlError("Enter a valid image URL (https://…)");
      return;
    }
    setUrlError(null);
    onUrl?.(url.trim());
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-[15px] font-semibold text-[var(--content-title)]">{title}</h2>
        {badge && <span className="rounded-[var(--radius-pill)] bg-[var(--composer-chip)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand)]">{badge}</span>}
      </div>
      <p className="mb-4 text-[12px] text-[var(--brand)]">You can create one twin per account.</p>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && !disabled) onFile(f); }}
        className={cn("rounded-[var(--radius-card)] border-2 border-dashed px-4 py-8 text-center transition-colors", over ? "border-[var(--brand)] bg-[var(--composer-chip)]" : "border-[var(--border)] bg-[var(--composer-well)]")}
      >
        <Upload size={22} strokeWidth={1.5} className="mx-auto mb-2 text-[var(--content-caption)]" />
        <p className="text-[13.5px] font-medium text-[var(--content-title)]">Upload or Drag &amp; Drop</p>

        {urlMode ? (
          <div className="mx-auto mt-4 flex max-w-md flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter image URL…"
              aria-label="Image URL"
              aria-invalid={!!urlError}
              className="h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-[13.5px] outline-none focus:border-[var(--brand)]"
            />
            <button type="button" onClick={submitUrl} disabled={disabled} className="twin-gradient h-10 px-4 text-[13px] font-semibold">Upload</button>
            <button type="button" onClick={() => { setUrlMode(false); setUrlError(null); }} className="h-10 text-[13px] text-[var(--content-caption)] hover:underline">Cancel</button>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="twin-gradient h-10 px-4 text-[13px] font-semibold">
              {buttonLabel}
            </button>
            {onUrl && (
              <button type="button" disabled={disabled} onClick={() => setUrlMode(true)} className="flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-4 text-[13px] text-[var(--content-title)] hover:bg-[var(--canvas-muted)]">
                <LinkIcon size={14} strokeWidth={1.75} /> Enter URL
              </button>
            )}
          </div>
        )}
        {urlError && <p role="alert" className="mt-2 text-[12.5px] text-red-600">{urlError}</p>}
        <p className="mt-3 text-[12px] text-[var(--content-caption)]">{helper}</p>
        <input ref={input} type="file" accept={accept} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </div>
    </section>
  );
}

function CreateTwinInner() {
  const router = useRouter();
  const credential = useHeygenCredential();
  const tenant = resolveAppTenant();
  const [existing, setExisting] = useState(() => (typeof window === "undefined" ? null : getLocalTwin(tenant)));
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<HeygenAvatar | null>(null);

  // Twin's upload bar creeps forward in ~12% random steps every 400ms, capped
  // at 85% until the request resolves, then jumps to 100.
  useEffect(() => {
    if (progress === null || progress >= 85) return;
    const t = setTimeout(() => setProgress((p) => Math.min(85, (p ?? 0) + Math.random() * 12)), 400);
    return () => clearTimeout(t);
  }, [progress]);

  async function createTwin(source: Blob, name: string, imageUrl?: string) {
    if (existing) {
      setError("You already have a twin. Delete your existing twin before creating another.");
      return;
    }
    setError(null);
    setProgress(2);
    try {
      setStage("Uploading…");
      const asset = await uploadHeygenAsset(source);
      if (!asset.image_key) throw new Error("Upload returned no image key");
      setStage("Creating your twin…");
      const group = await createPhotoAvatarGroup({ name, image_key: asset.image_key });
      setStage("Training…");
      await finalizeAndTrain(group.group_id);
      setProgress(100);
      setLocalTwin(tenant, { groupId: group.group_id, name, imageUrl: imageUrl ?? asset.url, createdAt: Date.now() });
      setExisting(getLocalTwin(tenant));
      router.push("/videos/my?type=twin");
    } catch (err) {
      setProgress(null);
      setStage("");
      if (err instanceof HeygenCredentialMissingError) setError("HeyGen integration required.");
      else if (err instanceof Error && /413|too large/i.test(err.message)) setError("File too large. Please use a smaller file.");
      else setError(`Upload failed${err instanceof Error && err.message ? ` (${err.message.slice(0, 80)})` : ""}.`);
    }
  }

  function onPhoto(file: File) {
    if (!PHOTO_TYPES.includes(file.type)) return setError("Supported formats: JPG, PNG, GIF, WEBP.");
    if (file.size > PHOTO_MAX) return setError("File too large. Please use a smaller file.");
    void createTwin(file, "My Twin");
  }

  async function onVideo(file: File) {
    if (!VIDEO_TYPES.includes(file.type)) return setError("Supported formats: MP4, MOV, WEBM.");
    if (file.size > VIDEO_MAX) return setError("File too large. Please use a smaller file.");
    try {
      const frame = await firstFrame(file);
      void createTwin(frame, "My Twin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that video.");
    }
  }

  async function onUrl(url: string) {
    if (!/^https?:\/\//i.test(url)) return setError("Only http(s) image URLs are supported.");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      if (!PHOTO_TYPES.includes(blob.type)) return setError("Supported formats: JPG, PNG, GIF, WEBP.");
      void createTwin(blob, "My Twin", url);
    } catch {
      setError("Could not download that image URL.");
    }
  }

  const busy = progress !== null;

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-7 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-start lg:justify-between">
        <h1 className="text-[24px] font-semibold tracking-[-0.6px] text-[var(--content-title)]">Create Twin</h1>
        <div className="flex items-center gap-3 rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-[13px] text-[var(--content-title)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/iblai-logo.png" alt="ibl.ai" className="h-4 w-auto" />
          <span>Want to Create a Hyper-Realistic Live Avatar?</span>
          <a href="mailto:support@iblai.zendesk.com" className="font-medium text-[var(--brand)] hover:underline">Contact Us</a>
        </div>
      </header>

      {credential === "missing" ? (
        <HeygenGate />
      ) : (
        <>
          {existing && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--composer-chip)] px-4 py-3 text-[13.5px] text-[var(--content-title)]">
              <span>Your twin <strong>{existing.name}</strong> is ready. Use it from <Link href="/videos/my?type=twin" className="text-[var(--brand)] hover:underline">My Videos</Link>.</span>
              <button type="button" onClick={() => { setLocalTwin(tenant, null); setExisting(null); }} className="text-[13px] text-[var(--content-caption)] hover:underline">Delete twin</button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Dropzone title="Start with a photo" helper="Supported formats: JPG, PNG, GIF, WEBP. Max size: 10MB." accept="image/jpeg,image/png,image/gif,image/webp" buttonLabel="Upload Photo" onFile={onPhoto} onUrl={onUrl} disabled={busy} />
            <Dropzone title="Start with video" badge="Most realistic" helper="Supported formats: MP4, MOV, WEBM. Max size: 100MB." accept="video/mp4,video/quicktime,video/webm" buttonLabel="Upload Video" onFile={onVideo} disabled={busy} />
          </div>

          {busy && (
            <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-4" role="status" aria-live="polite">
              <div className="mb-2 flex justify-between text-[12.5px] text-[var(--content-title)]"><span>{stage}</span><span className="tabular-nums">{Math.round(progress)}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--canvas-muted)]">
                <div className="twin-gradient h-full transition-[width] duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {error && <p role="alert" className="mt-4 text-[13.5px] text-red-600">{error}</p>}

          <section className="mt-10">
            <h2 className="text-[18px] font-semibold text-[var(--content-title)]">Gallery</h2>
            <p className="mb-5 text-[13.5px] text-[var(--content-caption)]">Choose an Avatar, add or select a Voice, and get an Avatar Video in minutes.</p>
            <AvatarGallery title="Gallery" limit={12} showControls={false} onSelect={setSelected} />
            <Link href="/ai-avatar/my" className="mt-5 inline-flex items-center gap-1 text-[13.5px] font-medium text-[var(--brand)] hover:underline">
              More <ArrowRight size={14} strokeWidth={1.75} />
            </Link>
          </section>
        </>
      )}

      {selected && <GenerateModal avatar={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function CreateTwinPage() {
  return (
    <Suspense fallback={<div className="p-8 text-[13.5px] text-[var(--content-caption)]">Loading…</div>}>
      <CreateTwinInner />
    </Suspense>
  );
}
