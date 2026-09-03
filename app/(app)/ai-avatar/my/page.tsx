"use client";

import { Suspense, useState } from "react";

import { AvatarGallery } from "@/components/twin/avatar-gallery";
import { GenerateModal } from "@/components/twin/generate-modal";
import type { HeygenAvatar } from "@/lib/heygen/rest";

function Inner() {
  const [selected, setSelected] = useState<HeygenAvatar | null>(null);
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-7 sm:mb-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.6px] text-[var(--content-title)]">Gallery</h1>
        <p className="mt-1 text-[14px] text-[var(--content-caption)]">
          Choose an Avatar, add or select a Voice, and get an Avatar Video in minutes.
        </p>
      </header>
      <AvatarGallery title="Gallery" onSelect={setSelected} />
      {selected && <GenerateModal avatar={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-[13.5px] text-[var(--content-caption)]">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
