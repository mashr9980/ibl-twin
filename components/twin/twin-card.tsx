"use client";

// The user's own twin: picture and the way to make a video with it.
// Shown on My Videos → Twin and on Create Twin.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clapperboard, Trash2 } from "lucide-react";

import { GenerateModal } from "@/components/twin/generate-modal";
import { getPhotoAvatarLook, type HeygenAvatar } from "@/lib/heygen/rest";
import type { LocalTwin } from "@/lib/twin/library-types";

const OUTLINE_BTN =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-4 text-[13px] font-normal text-[var(--content-title)] shadow-sm transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-50";
const PRIMARY_BTN =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50";

export function TwinCard({
  twin,
  onDelete,
  onGenerated,
  showLibraryLink = false,
}: {
  twin: LocalTwin;
  onDelete: () => void;
  /** A video was just requested from this twin. */
  onGenerated?: () => void;
  showLibraryLink?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // HeyGen's picture links expire, so the look is re-read each time the card mounts.
  const [image, setImage] = useState<string | null>(twin.imageUrl ?? null);

  useEffect(() => {
    let cancelled = false;
    getPhotoAvatarLook(twin.groupId)
      .then((look) => !cancelled && look?.image_url && setImage(look.image_url))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [twin.groupId]);

  // The modal wants an avatar; the twin's look is one, addressed as a talking photo.
  const asAvatar: HeygenAvatar = {
    avatar_id: twin.lookId ?? twin.groupId,
    avatar_name: twin.name,
    preview_image_url: image,
  };

  return (
    <>
      <section
        aria-label="Your twin"
        className="mb-6 flex flex-col gap-4 rounded-[9px] border border-[var(--border)] bg-[var(--card)] p-4 sm:flex-row sm:items-center"
      >
        <div className="size-24 shrink-0 overflow-hidden rounded-[8px] bg-[var(--canvas-muted)]">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={twin.name} className="size-full object-cover" onError={() => setImage(null)} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--content-title)] sm:text-base">{twin.name}</h2>
            <span className="rounded-full bg-[#e8f7ee] px-2.5 py-0.5 text-[12px] font-medium text-[#2f7a4a]">Ready</span>
          </div>
          <p className="mt-1 text-[12.5px] text-[var(--content-caption)]">
            Your twin speaks any script you write, in the voice you pick.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={PRIMARY_BTN} onClick={() => setOpen(true)}>
              <Clapperboard className="size-4" strokeWidth={1.75} />
              Create video with my twin
            </button>
            {showLibraryLink && (
              <Link href="/videos/my?type=twin" className={OUTLINE_BTN}>
                My twin videos
              </Link>
            )}
            <button type="button" className={OUTLINE_BTN} onClick={onDelete}>
              <Trash2 className="size-4" strokeWidth={1.75} />
              Delete twin
            </button>
          </div>
        </div>
      </section>
      {open && (
        <GenerateModal
          avatar={asAvatar}
          kind="twin"
          onClose={() => setOpen(false)}
          onGenerated={() => {
            setOpen(false);
            onGenerated?.();
          }}
        />
      )}
    </>
  );
}
