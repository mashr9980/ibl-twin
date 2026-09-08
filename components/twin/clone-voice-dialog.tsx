"use client";

// "Clone My Voice", laid out as twin.memorare.ai's: a name, one recording,
// and HeyGen's instant clone behind it.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mic, Upload, X } from "lucide-react";

import { Alert } from "@/components/twin/alert";
import {
  cloneVoice,
  getVoiceClone,
  heygenErrorMessage,
  uploadHeygenV3Asset,
} from "@/lib/heygen/rest";
import { cn } from "@/lib/utils";

const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"];
const AUDIO_MAX = 50 * 1024 * 1024;
const POLL_MS = 5000;
const POLL_LIMIT = 60;

const LABEL =
  "flex items-center gap-2 select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 text-sm font-medium text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)]";
const INPUT =
  "flex h-10 w-full rounded-[8px] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-base leading-snug text-[var(--sidebar-foreground)] shadow-sm outline-none placeholder:text-[11px] placeholder:leading-snug placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[var(--foreground)] dark:focus-visible:border-[var(--brand-on-dark)] sm:text-[13px] sm:placeholder:text-[13px]";
const CANCEL_BTN =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[5px] border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-normal text-[var(--sidebar-foreground)] shadow-sm transition-colors hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)] disabled:pointer-events-none disabled:opacity-50 dark:text-[var(--foreground)]";
const SUBMIT_BTN =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[5px] border-0 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] px-4 py-2 text-xs font-medium text-white shadow-none transition-all hover:brightness-[0.96] active:brightness-[0.92] disabled:pointer-events-none disabled:opacity-50 sm:text-[13px]";

export function CloneVoiceDialog({ open, onClose, onCloned }: { open: boolean; onClose: () => void; onCloned: () => void }) {
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  useEffect(() => {
    if (open) return;
    setName("");
    setFile(null);
    setError(null);
    setStage("");
  }, [open]);

  function pick(chosen: File) {
    setError(null);
    if (!AUDIO_TYPES.includes(chosen.type)) return setError("Supported formats: MP3 and WAV.");
    if (chosen.size > AUDIO_MAX) return setError("That recording is over 50MB. Please use a shorter one.");
    setFile(chosen);
    if (!name.trim()) setName(chosen.name.replace(/\.[^.]+$/, ""));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      setStage("Uploading…");
      const asset = await uploadHeygenV3Asset(file);
      setStage("Cloning…");
      const { voice_clone_id } = await cloneVoice({ name: name.trim(), assetId: asset.asset_id });
      // Cloning is asynchronous; wait for it so the new voice is there when we close.
      for (let i = 0; i < POLL_LIMIT; i++) {
        const voice = await getVoiceClone(voice_clone_id).catch(() => null);
        if (voice?.status === "complete") break;
        if (voice?.status === "failed") throw new Error("heygen: voice cloning failed");
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      onCloned();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error && /voice cloning failed/.test(err.message)
          ? "HeyGen couldn't clone that recording. Try a clearer one of at least 30 seconds."
          : heygenErrorMessage(err, "Couldn't clone your voice. Please try again."),
      );
    } finally {
      setBusy(false);
      setStage("");
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <button type="button" aria-label="Close" onClick={() => !busy && onClose()} className="absolute inset-0" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="clone-voice-title"
        aria-describedby="clone-voice-description"
        className="relative flex max-h-[min(92dvh,calc(100dvh-2rem))] w-[min(calc(100vw-2rem),520px)] max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-0 text-[var(--card-foreground)] shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
      >
        <div className="shrink-0 space-y-2 border-b border-[var(--border)] px-4 py-4 text-left sm:px-6">
          <h2 id="clone-voice-title" className="text-base font-semibold text-[var(--sidebar-foreground)] dark:text-[var(--foreground)] sm:text-lg">
            Clone My Voice
          </h2>
          <p id="clone-voice-description" className="text-left text-xs leading-snug text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)] sm:text-[13px]">
            Upload a clear audio recording of your voice (at least 30 seconds).
          </p>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] px-4 py-4 dark:bg-[color-mix(in_oklab,var(--muted)_25%,transparent)] sm:px-6 sm:py-5">
            <div className="space-y-4">
              {error && <Alert tone="warning" onDismiss={() => setError(null)}>{error}</Alert>}

              <div className="space-y-2">
                <label className={LABEL} htmlFor="clone-voice-name">Voice Name</label>
                <input
                  id="clone-voice-name"
                  className={INPUT}
                  placeholder="e.g., My Voice"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                />
              </div>

              <div className="space-y-2">
                <span className={LABEL}>Audio File</span>
                <input
                  ref={input}
                  accept={AUDIO_TYPES.join(",")}
                  className="sr-only"
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pick(f);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => input.current?.click()}
                  className={cn(
                    "flex w-full flex-col items-center justify-center rounded-[5px] border border-dashed border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] px-4 py-10 transition-colors hover:border-[var(--brand)] hover:bg-[var(--composer-chip)] disabled:pointer-events-none disabled:opacity-50 dark:bg-[color-mix(in_oklab,var(--muted)_25%,transparent)] dark:hover:border-[var(--brand-on-dark)] dark:hover:bg-sky-950/35",
                  )}
                >
                  <Upload className="mb-3 size-8 text-[var(--muted-foreground)]" strokeWidth={1.25} aria-hidden />
                  <p className="text-center text-xs leading-snug text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)] sm:text-[13px]">
                    {file ? file.name : "Click to upload MP3 or WAV"}
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-row flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] bg-[var(--card)] px-4 py-4 sm:px-6">
            <button type="button" onClick={onClose} disabled={busy} className={CANCEL_BTN}>
              Cancel
            </button>
            <button type="submit" disabled={busy || !file || !name.trim()} aria-busy={busy} className={SUBMIT_BTN}>
              <Mic className="size-4" strokeWidth={1.75} aria-hidden />
              {busy ? stage || "Cloning…" : "Clone Voice"}
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={() => !busy && onClose()}
          className="absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 disabled:pointer-events-none"
        >
          <X className="size-4" strokeWidth={2} aria-hidden />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>,
    document.body,
  );
}
