"use client";

/**
 * Create Twin — twin.memorare.ai's home screen (teardown §2.1).
 * Photo or video → HeyGen photo-avatar group → trained twin, one per account.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Link as LinkIcon, Upload } from "lucide-react";

import type { LucideIcon } from "lucide-react";
import { Image as ImageIcon, Video as VideoIcon } from "lucide-react";

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
import { Alert } from "@/components/twin/alert";
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
const OUTLINE_BTN =
  "inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-normal text-[var(--content-title)] shadow-none transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 sm:h-9 sm:gap-2 sm:px-4 sm:text-[13px]";

/**
 * In dark mode twin tints these by action rather than leaving them grey:
 * blue for the upload paths, violet for Enter URL. Light mode is untouched.
 */
const DARK_BLUE =
  "dark:!border-[#4696ED]/55 dark:!bg-[#4696ED]/14 dark:!text-[#4696ED] dark:hover:!border-[#4696ED]/70 dark:hover:!bg-[#4696ED]/22 dark:hover:!text-[#4696ED]";
const DARK_VIOLET =
  "dark:!border-[#9870FD]/55 dark:!bg-[#9870FD]/14 dark:!text-[#9870FD] dark:hover:!border-[#9870FD]/70 dark:hover:!bg-[#9870FD]/22 dark:hover:!text-[#9870FD]";

function Dropzone({
  Icon,
  title,
  progress,
  badge,
  helper,
  accept,
  buttonLabel,
  onFile,
  onUrl,
  disabled,
}: {
  Icon: LucideIcon;
  progress?: number | null;
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
    <article className="flex flex-col rounded-[9px] border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="mb-3 sm:mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold text-[var(--content-title)] sm:text-sm">{title}</h2>
          {badge && (
            <span className="inline-flex items-center rounded-[5px] border border-[#D0E0FF] bg-[#F5F8FF] px-2 py-0 text-[9px] font-medium text-[#38A1E5] dark:border-[#FCCA1A]/45 dark:bg-transparent dark:text-[#FCCA1A] sm:text-[10px]">
              {badge}
            </span>
          )}
        </div>
        <p className="mt-1 text-[10px] leading-snug text-[var(--brand)] sm:text-[11px]">You can create one twin per account.</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && !disabled) onFile(f); }}
        className={cn(
          "flex min-h-[180px] flex-col items-center justify-center rounded-[9px] border border-dashed px-4 py-6 text-center transition-[border-color,background-color,box-shadow] duration-300 sm:min-h-[200px] sm:px-6 sm:py-8",
          progress != null
            ? "border-[var(--brand)] bg-[color-mix(in_oklab,var(--composer-chip)_60%,transparent)] shadow-[inset_0_0_0_1px_rgba(56,161,229,0.08)] dark:border-[#5ec4ff]/50 dark:bg-sky-950/40"
            : over
              ? "border-[var(--brand)] bg-[var(--composer-chip)]"
              : "border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] dark:bg-[color-mix(in_oklab,var(--muted)_25%,transparent)]",
        )}
      >
        {progress != null ? (
          <div className="upload-progress-enter flex w-full max-w-[280px] flex-col items-center gap-3.5">
            <p className="text-xs font-medium text-[var(--card-foreground)] sm:text-[13px]">
              Uploading
              <span className="inline-flex w-[1.1em] translate-y-px" aria-hidden="true">
                <span className="upload-progress-dot">.</span>
                <span className="upload-progress-dot [animation-delay:160ms]">.</span>
                <span className="upload-progress-dot [animation-delay:320ms]">.</span>
              </span>
            </p>
            <div className="w-full space-y-2">
              <div
                role="progressbar"
                aria-valuenow={Math.round(progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
                className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]"
              >
                <div
                  className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#38A1E5] via-[#4DAEE8] to-[#38A1E5] transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${progress}%` }}
                >
                  <span className="upload-progress-shimmer absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                </div>
              </div>
              <p className="text-center text-xs tabular-nums text-[var(--muted-foreground)]">{Math.round(progress)}%</p>
            </div>
          </div>
        ) : (
          <>
        <Icon strokeWidth={1.25} aria-hidden className="mb-2.5 size-8 text-[var(--muted-foreground)] sm:mb-3 sm:size-9" />
        <p className="mb-3 text-xs leading-snug text-[var(--muted-foreground)] sm:mb-4 sm:text-[13px]">Upload or Drag &amp; Drop</p>

        {urlMode ? (
          <div className="mx-auto flex w-full max-w-md flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter image URL…"
              aria-label="Image URL"
              aria-invalid={!!urlError}
              className="h-9 min-w-0 flex-1 rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-3 text-[13px] outline-none focus:border-[var(--brand)]"
            />
            <button type="button" onClick={submitUrl} disabled={disabled} className={cn(OUTLINE_BTN, DARK_BLUE)}>Upload</button>
            <button type="button" onClick={() => { setUrlMode(false); setUrlError(null); }} className="h-9 text-[13px] text-[var(--content-caption)] hover:underline">Cancel</button>
          </div>
        ) : (
          <div className="flex flex-row flex-wrap items-center justify-center gap-3">
            <button type="button" disabled={disabled} onClick={() => input.current?.click()} className={cn(OUTLINE_BTN, DARK_BLUE)}>
              <Upload className="size-4" strokeWidth={1.75} aria-hidden />
              {buttonLabel}
            </button>
            {onUrl && (
              <button type="button" disabled={disabled} onClick={() => setUrlMode(true)} className={cn(OUTLINE_BTN, DARK_VIOLET)}>
                <LinkIcon className="size-4" strokeWidth={1.75} aria-hidden />
                Enter URL
              </button>
            )}
          </div>
        )}
          </>
        )}
        {urlError && <Alert className="mt-2 w-full">{urlError}</Alert>}
        <input ref={input} type="file" accept={accept} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      </div>

      <p className="mt-3 text-left text-[10px] leading-snug text-[var(--muted-foreground)] sm:text-[11px]">{helper}</p>
    </article>
  );
}

function CreateTwinInner() {
  const router = useRouter();
  const credential = useHeygenCredential();
  const tenant = resolveAppTenant();
  const [existing, setExisting] = useState(() => (typeof window === "undefined" ? null : getLocalTwin(tenant)));
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState("");
  const [busySource, setBusySource] = useState<"photo" | "video" | null>(null);
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
      setBusySource(null);
      setStage("");
      if (err instanceof HeygenCredentialMissingError) setError("HeyGen integration required.");
      else if (err instanceof Error && /413|too large/i.test(err.message)) setError("File too large. Please use a smaller file.");
      else setError(`Upload failed${err instanceof Error && err.message ? ` (${err.message.slice(0, 80)})` : ""}.`);
    }
  }

  function onPhoto(file: File) {
    if (!PHOTO_TYPES.includes(file.type)) return setError("Supported formats: JPG, PNG, GIF, WEBP.");
    if (file.size > PHOTO_MAX) return setError("File too large. Please use a smaller file.");
    setBusySource("photo");
    void createTwin(file, "My Twin");
  }

  async function onVideo(file: File) {
    setBusySource("video");
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
    setBusySource("photo");
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
        <h1 className="text-lg font-semibold tracking-tight text-[var(--content-title)] sm:text-xl md:text-2xl">Create Twin</h1>
        <div className="flex w-full max-w-full items-center gap-2.5 rounded-[9px] border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-xs leading-snug text-[var(--content-title)] shadow-sm dark:shadow-[0_1px_2px_rgba(0,0,0,0.35)] sm:w-fit sm:shrink-0 sm:gap-3 sm:px-4 sm:py-3 sm:text-[13px]">
          <img src="/images/iblai-logo.png" alt="ibl.ai" width={40} height={16} loading="lazy" decoding="async" className="mb-1.5 h-4 w-10 shrink-0 object-contain" />
          {/* One paragraph, so the sentence wraps as a block and the link sits
              on its own line below it on phones. */}
          <p className="leading-snug">
            Want to Create a Hyper-Realistic Live Avatar?{" "}
            <a
              href="mailto:support@iblai.zendesk.com"
              className="block text-xs font-medium text-[var(--brand)] underline-offset-2 hover:text-[var(--brand-hover)] hover:underline sm:inline sm:text-[13px]"
            >
              Contact Us
            </a>
          </p>
        </div>
      </header>

      {credential === "missing" ? (
        <HeygenGate />
      ) : (
        <>
          {existing && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#38A1E5]/50 bg-[#eef6fc] px-4 py-3 text-sm text-[#38A1E5] dark:border-[#5ec4ff]/40 dark:bg-[rgb(15_45_72_/_0.92)] dark:text-[#5ec4ff]">
              <span>Your twin <strong>{existing.name}</strong> is ready. Use it from <Link href="/videos/my?type=twin" className="text-[var(--brand)] hover:underline">My Videos</Link>.</span>
              <button type="button" onClick={() => { setLocalTwin(tenant, null); setExisting(null); }} className="ml-4 text-current/70 transition-colors hover:text-current">Delete twin</button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Dropzone progress={busySource === "photo" ? progress : null} Icon={ImageIcon} title="Start with a photo" helper="Supported formats: JPG, PNG, GIF, WEBP. Max size: 10MB." accept="image/jpeg,image/png,image/gif,image/webp" buttonLabel="Upload Photo" onFile={onPhoto} onUrl={onUrl} disabled={busy} />
            <Dropzone progress={busySource === "video" ? progress : null} Icon={VideoIcon} title="Start with video" badge="Most realistic" helper="Supported formats: MP4, MOV, WEBM. Max size: 100MB." accept="video/mp4,video/quicktime,video/webm" buttonLabel="Upload Video" onFile={onVideo} disabled={busy} />
          </div>


          <section className="mt-10 pb-8 sm:mt-12 sm:pb-12">
            <h2 className="text-sm font-semibold text-[var(--content-title)] sm:text-base">Gallery</h2>
            <p className="mb-4 mt-1 text-xs text-[var(--content-title)] sm:mb-5 sm:text-[13px]">Choose an Avatar, add or select a Voice, and get an Avatar Video in minutes.</p>
            <AvatarGallery title="Gallery" limit={12} showControls={false} variant="tiles" onSelect={setSelected} />
          {/* twin renders this as an outline button, centred under the grid. */}
          <div className="mt-6 flex justify-center">
            <Link
              href="/ai-avatar/my"
              className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-normal text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]"
            >
              More
              <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
            </Link>
          </div>
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
