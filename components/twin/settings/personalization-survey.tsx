"use client";

// The Personalization survey, laid out as twin.memorare.ai's: one question a
// step, tap an answer, Continue counts up to 7. Answers land in the profile.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";

import type { TwinProfile } from "@/hooks/use-twin-preferences";
import { cn } from "@/lib/utils";
import { PRIMARY_BTN_LG } from "./ui";

type Step = { key: keyof TwinProfile; question: string; options: string[] };

const STEPS: Step[] = [
  {
    key: "use",
    question: "Are you using Memorare Twin for business, personal, or student use?",
    options: ["For my business", "Personal use", "School or student projects"],
  },
  { key: "role", question: "What best describes what you do?", options: ["Founder or executive", "Teacher or trainer", "Marketer or creator", "Student", "Something else"] },
  { key: "industry", question: "Which industry are you in?", options: ["Education", "Software or SaaS", "Healthcare", "Finance", "Media or marketing", "Other"] },
  { key: "audience", question: "Who will watch your videos?", options: ["Students", "Customers", "My team", "Social media followers", "Friends and family"] },
  { key: "tone", question: "How should your twin sound?", options: ["Warm and friendly", "Clear and professional", "Energetic", "Calm and measured"] },
  { key: "topics", question: "What will you mostly talk about?", options: ["Lessons and tutorials", "Product updates", "Announcements", "Stories and personal updates", "A mix of things"] },
];

const TOTAL = STEPS.length + 1;

const OPTION =
  "flex min-h-[44px] w-full items-center justify-between gap-3 rounded-[8px] px-4 py-3 text-left text-sm text-[var(--foreground)] transition-colors";
const OPTION_OFF = "bg-[color-mix(in_oklab,var(--muted)_60%,transparent)] hover:bg-[var(--muted)]";
const OPTION_ON = "bg-[var(--muted)] font-medium";
const DISABLED_BTN =
  "inline-flex h-11 w-full items-center justify-center rounded-[8px] bg-[var(--muted)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] disabled:pointer-events-none";

export function PersonalizationSurvey({
  open,
  initial,
  onClose,
  onComplete,
}: {
  open: boolean;
  initial: TwinProfile;
  onClose: () => void;
  onComplete: (profile: TwinProfile) => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<TwinProfile>(initial);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setAnswers(initial);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const current = STEPS[step];
  const review = !current;
  const picked = current ? (answers[current.key] ?? "") : "";
  const canContinue = review || !!picked;

  function next() {
    if (review) return onComplete(answers);
    setStep((n) => n + 1);
  }

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="survey-title"
        aria-describedby="survey-description"
        className="relative flex max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden overscroll-contain rounded-[8px] border border-[var(--border)] bg-[var(--card)] p-0 shadow-lg sm:max-w-[560px]"
      >
        <h2 id="survey-title" className="sr-only">Personalization survey</h2>
        <p id="survey-description" className="sr-only">Help us tailor your experience</p>

        <header className="relative flex items-center justify-center px-4 pb-2 pt-5 sm:px-6">
          <p className="w-full pr-10 text-left text-base font-semibold text-[var(--foreground)] sm:text-lg">
            Help us tailor Memorare Twin for you
          </p>
          <button
            type="button"
            aria-label="Close survey"
            onClick={onClose}
            className="absolute right-4 top-5 inline-flex size-9 items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] sm:right-6"
          >
            <X className="size-4" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 sm:px-6">
          {review ? (
            <>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-[var(--foreground)] sm:text-base">Here is what your twin will remember</h2>
              </div>
              <dl className="mt-4 space-y-3">
                {STEPS.filter((s) => answers[s.key]).map((s) => (
                  <div key={s.key} className="rounded-[8px] bg-[color-mix(in_oklab,var(--muted)_60%,transparent)] px-4 py-3">
                    <dt className="text-xs text-[var(--muted-foreground)]">{s.question}</dt>
                    <dd className="mt-1 text-sm text-[var(--foreground)]">{answers[s.key]}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-[var(--foreground)] sm:text-base">{current.question}</h2>
              </div>
              <div className="mt-4 space-y-2">
                {current.options.map((option) => {
                  const on = picked === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAnswers({ ...answers, [current.key]: option })}
                      className={cn(OPTION, on ? OPTION_ON : OPTION_OFF)}
                    >
                      <span className="min-w-0 flex-1 leading-snug">{option}</span>
                      {on && <Check className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <footer className="shrink-0 px-4 pb-5 pt-2 sm:px-6 sm:pb-6">
          <button
            type="button"
            disabled={!canContinue}
            onClick={next}
            className={canContinue ? cn(PRIMARY_BTN_LG, "h-11 w-full rounded-[8px]") : DISABLED_BTN}
          >
            {review ? "Finish" : `Continue ${step + 1}/${TOTAL}`}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
