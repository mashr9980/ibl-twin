import Link from "next/link";

/** Sticky app footer, 2.75rem, matching twin.memorare.ai. */
export function AppFooter() {
  return (
    <footer
      style={{ height: "var(--app-footer-height)" }}
      className="flex flex-none items-center justify-between border-t border-[var(--border)] bg-[var(--background)] px-4 text-[12.5px] text-[var(--content-caption)]"
    >
      <div className="flex items-center gap-3">
        <Link href="/privacy" className="transition-colors hover:text-[var(--content-title)]">
          Privacy Policy
        </Link>
        <span aria-hidden="true">·</span>
        <Link href="/terms" className="transition-colors hover:text-[var(--content-title)]">
          Terms &amp; Conditions
        </Link>
      </div>
      <div className="flex items-center gap-1.5">
        <span>Powered by</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://ibl.ai/images/iblai-logo.png" alt="ibl.ai" className="h-4 w-auto" />
      </div>
    </footer>
  );
}
