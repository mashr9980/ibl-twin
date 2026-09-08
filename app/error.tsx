"use client";

import Link from "next/link";

// Last line of defence: a thrown render error shows this instead of a blank page.

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--sidebar-bg,#fafbfc)] px-6 text-center">
      <h1 className="text-lg font-semibold text-[var(--content-title,#111827)]">Something went wrong</h1>
      <p className="max-w-sm text-sm text-[var(--content-caption,#6b7280)]">
        The page hit an unexpected error. Trying again usually fixes it.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-9 items-center justify-center rounded-[8px] bg-gradient-to-r from-[var(--brand,#0058cc)] to-[var(--brand-violet,#7c3aed)] px-4 text-[13px] font-medium text-white"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-[8px] border border-[var(--border,#e5e7eb)] bg-white px-4 text-[13px] text-[var(--content-title,#111827)]"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
