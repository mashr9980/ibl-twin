"use client";

// Preferences, laid out as twin.memorare.ai's: the app's language and the
// three appearance cards. Both are saved to the member's platform metadata.

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus, RectangleHorizontal, RectangleVertical } from "lucide-react";

import { Alert } from "@/components/twin/alert";
import { applyTheme, LANGUAGES, useTwinPreferences, type Language, type Theme } from "@/hooks/use-twin-preferences";
import { cn } from "@/lib/utils";
import { FIELD_LABEL } from "./ui";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "system", label: "Auto" },
  { value: "dark", label: "Dark" },
];

/** The composer bar, drawn small, as it looks in each theme. */
function MiniComposer({ dark = false }: { dark?: boolean }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1 rounded-[4px] border px-1.5 py-1", dark ? "border-white/15 bg-[#2d3239]" : "border-[#e5e7eb] bg-white")}>
      <span className={cn("min-w-0 flex-1 truncate text-[8px] leading-tight", dark ? "text-white/45" : "text-[#9ca3af]")}>
        Describe the video you want...
      </span>
      <span
        aria-hidden="true"
        className={cn("inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border", dark ? "border-white/20 text-white/70" : "border-[#e5e7eb] text-[#6b7280]")}
      >
        <Plus className="size-2" strokeWidth={2.5} />
      </span>
      <span
        aria-hidden="true"
        className={cn("inline-flex h-3.5 shrink-0 items-center gap-0.5 rounded-[3px] border px-0.5 text-[7px]", dark ? "border-white/20 text-white/70" : "border-[#e5e7eb] text-[#6b7280]")}
      >
        Auto
        <ChevronDown className="size-2" strokeWidth={2.5} />
      </span>
      <span className="inline-flex shrink-0 items-center gap-px" aria-hidden="true">
        <RectangleVertical className={cn("size-2.5", dark ? "text-white/55" : "text-[#9ca3af]")} strokeWidth={2} />
        <RectangleHorizontal className={cn("size-2.5", dark ? "text-white/35" : "text-[#d1d5db]")} strokeWidth={2} />
      </span>
      <span className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-[#0078FF] text-white" aria-hidden="true">
        <span className="size-1.5 rounded-full bg-white/90" />
      </span>
    </div>
  );
}

function ThemePreview({ theme }: { theme: Theme }) {
  if (theme === "system") {
    return (
      <div className="flex h-[92px] overflow-hidden rounded-[8px]">
        <div className="flex w-1/2 flex-col justify-end border-r border-[#e5e7eb] bg-white p-2">
          <MiniComposer />
        </div>
        <div className="flex w-1/2 flex-col justify-end bg-[#252a31] p-2">
          <MiniComposer dark />
        </div>
      </div>
    );
  }
  const dark = theme === "dark";
  return (
    <div className={cn("flex h-[92px] flex-col justify-end rounded-[8px] p-2", dark ? "bg-[#252a31]" : "bg-white")}>
      <MiniComposer dark={dark} />
    </div>
  );
}

export function PreferencesSection({ tenantKey }: { tenantKey: string }) {
  const { prefs, save, error } = useTwinPreferences(tenantKey);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const language = LANGUAGES.find((l) => l.value === prefs.language) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickLanguage = (value: Language) => {
    setOpen(false);
    void save({ language: value }).catch(() => {});
  };

  const pickTheme = (value: Theme) => {
    applyTheme(value);
    void save({ theme: value }).catch(() => {});
  };

  return (
    <div className="w-full">
      <div className="space-y-8">
        {error && <Alert tone="warning">Couldn&apos;t save that preference. Please try again.</Alert>}

        <section className="space-y-3">
          <span className={FIELD_LABEL}>Language</span>
          <div ref={box} className="relative sm:max-w-md">
            <button
              type="button"
              role="combobox"
              aria-expanded={open}
              aria-label={`Language: ${language.label}`}
              onClick={() => setOpen((v) => !v)}
              className="flex h-11 w-full items-center justify-between rounded-[8px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base leading-snug text-[var(--sidebar-foreground)] shadow-none outline-none transition-colors focus:ring-2 focus:ring-[color-mix(in_oklab,var(--ring)_40%,transparent)] disabled:cursor-not-allowed disabled:opacity-50 dark:text-[var(--foreground)] sm:text-[13px]"
            >
              <span className="flex min-w-0 flex-1 items-center overflow-hidden text-left">
                <span className="inline-flex min-w-0 items-center gap-2 text-left">
                  <span className="shrink-0 text-base leading-none" aria-hidden="true">{language.flag}</span>
                  <span className="min-w-0 truncate leading-snug">{language.label}</span>
                </span>
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" strokeWidth={2} aria-hidden />
            </button>

            {open && (
              <ul
                role="listbox"
                aria-label="Language"
                className="absolute z-30 mt-1 w-full overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--popover)] p-1 shadow-[var(--shadow-popover)]"
              >
                {LANGUAGES.map((l) => (
                  <li key={l.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={l.value === prefs.language}
                      onClick={() => pickLanguage(l.value)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-[var(--accent)]",
                        l.value === prefs.language && "bg-[var(--composer-chip)] text-[var(--brand)]",
                      )}
                    >
                      <span className="shrink-0 text-base leading-none" aria-hidden="true">{l.flag}</span>
                      <span className="min-w-0 truncate">{l.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <span className={FIELD_LABEL}>Appearance</span>
          <div className="flex flex-col gap-4 sm:grid sm:max-w-xl sm:grid-cols-3 sm:gap-3" role="radiogroup" aria-label="Appearance">
            {THEMES.map(({ value, label }) => {
              const selected = prefs.theme === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => pickTheme(value)}
                  className="group flex w-full min-w-0 flex-row items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 sm:flex-col sm:items-stretch sm:gap-2"
                >
                  <div
                    className={cn(
                      "w-[min(52%,220px)] shrink-0 overflow-hidden rounded-[8px] border-2 transition-colors sm:w-full",
                      selected ? "border-[#38A1E5]" : "border-[#e5e7eb] dark:border-[var(--border)]",
                    )}
                  >
                    <ThemePreview theme={value} />
                  </div>
                  <span
                    className={cn(
                      "shrink-0 text-sm sm:w-full sm:text-center",
                      selected ? "font-medium text-[var(--sidebar-foreground)] dark:text-[var(--foreground)]" : "text-[var(--sidebar-foreground)] dark:text-[var(--muted-foreground)]",
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
