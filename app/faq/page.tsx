import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { FAQ } from "@/lib/twin/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Everything you need to know about creating AI avatar videos with Memorare Twin.",
};

/**
 * Twin's FAQ: a standalone page outside the app shell, with its own header and
 * the wordmark linking back to sign-in. Each item is a native <details>, so it
 * opens without JavaScript and the answers stay in the server-rendered HTML.
 */
export default function FaqPage() {
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

      <main className="mx-auto w-full max-w-4xl px-6 py-12 sm:px-8 sm:py-[50px]">
        <section id="faq-section-new" className="mx-auto w-full max-w-4xl">
          <header className="mb-8 text-center sm:mb-10">
            <h1 className="text-center text-[25px] font-semibold tracking-tight text-[var(--content-title)] sm:text-[45px]">
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-center text-base text-[var(--content-title)] sm:mt-2 sm:text-[13px] md:text-sm">
              Everything you need to know about creating AI avatar videos with Memorare Twin.
            </p>
          </header>

          <div className="mb-[100px] space-y-8">
            {FAQ.map((group) => (
              <div key={group.section} className="space-y-3">
                <div className="rounded-lg bg-[#E8EFFF] px-4 py-3 text-center dark:bg-sky-950/40">
                  <h2 className="text-sm font-semibold text-[var(--content-title)] sm:text-base">{group.section}</h2>
                </div>

                <div className="space-y-2">
                  {group.items.map((item) => (
                    <details
                      key={item.q}
                      className="group overflow-hidden rounded-[9px] border border-[var(--border)] bg-white dark:bg-[var(--card)] [&_summary::-webkit-details-marker]:hidden"
                    >
                      <summary className="flex w-full cursor-pointer list-none items-start justify-between gap-4 bg-white px-4 py-4 text-left transition-colors hover:bg-[#F5F8FF]/60 md:px-5 dark:bg-[var(--card)] dark:hover:bg-[var(--accent)]/50">
                        <span className="text-sm font-semibold text-[#3D4F5F] md:text-[15px] dark:text-[var(--foreground)]">{item.q}</span>
                        <span className="mt-0.5 shrink-0 text-[#7C9AB6] dark:text-[var(--muted-foreground)]">
                          <ChevronDown className="size-4 transition-transform group-open:rotate-180" strokeWidth={1.75} aria-hidden />
                        </span>
                      </summary>
                      <div className="border-t border-[var(--border)] bg-[#F5F8FF] px-4 pb-4 pt-3 md:px-5 dark:bg-sky-950/30">
                        <p className="text-sm leading-relaxed text-[#6B7280] dark:text-[var(--muted-foreground)]">{item.a}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
