import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[var(--canvas-muted)] px-4 py-10">
      <div className="mx-auto w-full max-w-[720px]">
        <Link href="/" className="mb-8 inline-flex items-center gap-2">
          <span aria-hidden="true" className="twin-gradient flex h-[30px] w-[29px] items-center justify-center rounded-[7px] text-[13px] font-bold">M</span>
          <span className="flex flex-col leading-[1.05]">
            <span className="text-[15px] font-medium text-[var(--brand)]">memorare</span>
            <span className="twin-gradient-text text-[17px] font-bold">twin</span>
          </span>
        </Link>
        <h1 className="text-[28px] font-semibold tracking-[-0.7px] text-[var(--content-title)]">{title}</h1>
        <p className="mt-2 mb-8 text-[13px] text-[var(--content-caption)]">Last updated {updated}</p>
        <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] p-6 [&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:text-[var(--content-title)] [&_h2:first-child]:mt-0 [&_li]:mb-1.5 [&_p]:mb-3 [&_p]:text-[13.5px] [&_p]:leading-relaxed [&_p]:text-[var(--content-caption)] [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:text-[13.5px] [&_ul]:leading-relaxed [&_ul]:text-[var(--content-caption)]">
          {children}
        </div>
        <p className="mt-8 text-center text-[12.5px] text-[var(--content-caption)]">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/terms" className="hover:underline">Terms &amp; Conditions</Link>
          <span aria-hidden="true"> · </span>
          <Link href="/faq" className="hover:underline">Help &amp; FAQ</Link>
        </p>
      </div>
    </main>
  );
}
