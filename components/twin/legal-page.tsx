import Link from "next/link";

import type { Block, LegalSection } from "@/lib/twin/privacy";

/**
 * Shell shared by twin's Privacy Policy and Terms pages: a sticky header
 * carrying the wordmark back to sign-in, then a centred article of numbered
 * sections. Both live outside the app shell, so there's no sidebar or footer.
 */
export function LegalPage({
  title,
  dates,
  intro,
  sections,
}: {
  title: string;
  dates: readonly string[];
  intro: readonly string[];
  sections: readonly LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_95%,transparent)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl items-center px-6 py-4 sm:px-8">
          <Link href="/login" className="inline-flex items-center transition-opacity hover:opacity-90">
            <span
              className="logo-section logo-section--custom"
              style={
                {
                  "--logo-img-h-custom": "43.333333333333336px",
                  "--logo-img-margin-top-custom": "0px",
                  "--logo-img-margin-bottom-custom": "1.3333333333333333px",
                } as React.CSSProperties
              }
            >
              <span className="logo-section__row">
                <img className="logo-section__img" src="/images/memorare-twin-logo.png" alt="memorare twin" />
                <span className="logo-section__text">
                  <span className="logo-section__line logo-section__line--top">memorare</span>
                  <span className="logo-section__line-wrap logo-section__line-wrap--bottom">
                    <span className="logo-section__line logo-section__line--bottom">twin</span>
                  </span>
                </span>
              </span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-8 sm:py-16">
        <article>
          <header className="mb-12 text-center sm:mb-16">
            <h1 className="text-[25px] font-bold tracking-tight text-[var(--foreground)] sm:text-[45px]">{title}</h1>
            {dates.map((d, i) => (
              <p key={d} className={`${i === 0 ? "mt-8" : "mt-2"} text-base font-semibold text-[var(--foreground)]`}>{d}</p>
            ))}
          </header>

          <div className="space-y-6">
            {intro.map((p) => (
              <p key={p} className="text-base leading-[1.7] text-[var(--foreground)]">{p}</p>
            ))}
          </div>

          <div className="mt-12 space-y-12 sm:mt-16">
            {sections.map((section) => (
              <section key={section.title} className="space-y-6">
                <h2 className="text-lg font-bold text-[var(--foreground)]">{section.title}</h2>
                <Blocks blocks={section.blocks} />
              </section>
            ))}
          </div>
        </article>
      </main>
    </div>
  );
}

function Blocks({ blocks }: { blocks: readonly Block[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((b, i) =>
        b.t === "h3" ? (
          <h3 key={i} className="text-base font-semibold text-[var(--foreground)]">{b.v}</h3>
        ) : b.t === "ul" ? (
          <ul key={i} className="list-disc space-y-2 pl-6 text-base leading-[1.7] text-[var(--foreground)]">
            {b.v.map((li) => <li key={li}>{li}</li>)}
          </ul>
        ) : (
          <p key={i} className="text-base leading-[1.7] text-[var(--foreground)]">{b.v}</p>
        ),
      )}
    </div>
  );
}
