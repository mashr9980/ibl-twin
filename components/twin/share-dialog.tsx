"use client";

/**
 * "Share this video" — twin's share dialog, rebuilt from its deployed markup.
 *
 * Ours previously navigated to the public watch page instead of offering
 * options. Copy link is live; the five tiles and the password switch render as
 * twin does but are inert, since neither the embed endpoints nor link
 * passwords exist on our side.
 */

import { useEffect, useState } from "react";
import { Code, Copy, Globe, Image as ImageIcon, Link as LinkIcon, X } from "lucide-react";

import { LinkedInIcon, XIcon } from "@/components/twin/nav-icons";
import { cn } from "@/lib/utils";

const TILE =
  "flex flex-col items-center gap-2 rounded-[5px] border border-[var(--border)] bg-[var(--card)] px-1 py-3 transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-50";
const TILE_LABEL = "text-[11px] font-medium text-[var(--content-title)]";

export function ShareDialog({
  open,
  onClose,
  videoId,
  title,
}: {
  open: boolean;
  onClose: () => void;
  videoId: string;
  title?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const [requirePassword, setRequirePassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const url = typeof window === "undefined" ? "" : `${window.location.origin}/video/watch/${videoId}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is still visible in the watch page URL */
    }
  }

  const tiles = [
    { label: "Embed", Icon: Globe },
    { label: "Thumbnail", Icon: ImageIcon },
    { label: "Code", Icon: Code },
    { label: "LinkedIn", Icon: LinkedInIcon },
    { label: "X", Icon: XIcon },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" />

      <div className="relative grid w-full max-w-[calc(100%-2rem)] gap-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] p-0 text-[var(--card-foreground)] shadow-[0_12px_40px_-12px_rgba(15,23,42,0.2)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.45)] sm:max-w-[420px]">
        <div className="border-b border-[var(--border)] px-6 py-4 text-center">
          <h2 id="share-title" className="text-base font-semibold text-[var(--content-title)]">Share this video</h2>
          <p className="sr-only">Share options for {title ?? "this video"}</p>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
              <LinkIcon className="size-5" strokeWidth={1.75} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--content-title)]">Anyone with the link</p>
              <p className="mt-1 text-xs leading-snug text-[var(--content-title)] sm:text-[13px]">
                Anyone on the internet with the link can view. No sign-in required.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-[var(--content-title)]">Require password</span>
            <button
              type="button"
              role="switch"
              aria-checked={requirePassword}
              aria-label="Require password to view"
              disabled
              title="Link passwords aren't available in this build"
              onClick={() => setRequirePassword((v) => !v)}
              className={cn(
                "inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all disabled:cursor-not-allowed disabled:opacity-50",
                requirePassword
                  ? "bg-gradient-to-r from-[#38A1E5] to-[#7284FF] shadow-[0_6px_18px_-10px_rgba(56,161,229,0.6)]"
                  : "bg-[var(--input)]",
              )}
            >
              <span
                className={cn(
                  "pointer-events-none block size-4 rounded-full bg-[var(--background)] transition-transform",
                  requirePassword && "translate-x-[calc(100%-2px)] bg-white",
                )}
              />
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {tiles.map(({ label, Icon }) => (
              <button key={label} type="button" disabled title="Not available in this build" className={TILE}>
                <span className="text-[var(--muted-foreground)]">
                  <Icon className="size-5" />
                </span>
                <span className={TILE_LABEL}>{label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={copy}
            className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-[5px] border-0 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] px-4 py-2 text-sm font-medium text-white shadow-none transition-all hover:brightness-[0.96] active:brightness-[0.92]"
          >
            <Copy className="size-4" strokeWidth={1.75} aria-hidden />
            {copied ? "Link copied" : "Copy link"}
          </button>
        </div>

        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100">
          <X className="size-4" strokeWidth={2} aria-hidden />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}
