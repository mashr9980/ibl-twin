"use client";

// Preferences: how the app looks and what a new video starts with.

import { useEffect, useState } from "react";

import { Alert } from "@/components/twin/alert";
import { applyTheme, useTwinPreferences, type Theme } from "@/hooks/use-twin-preferences";
import { listHeygenVoices, type HeygenVoice } from "@/lib/heygen/rest";
import { FIELD, HINT, LABEL, SECTION_TITLE } from "./ui";

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match my device" },
];

export function PreferencesSection({ tenantKey }: { tenantKey: string }) {
  const { prefs, save, saving, error } = useTwinPreferences(tenantKey);
  const [voices, setVoices] = useState<HeygenVoice[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    listHeygenVoices().then(setVoices).catch(() => {});
  }, []);

  async function change<K extends keyof typeof prefs>(key: K, value: (typeof prefs)[K]) {
    setSaved(false);
    if (key === "theme") applyTheme(value as Theme);
    await save({ [key]: value }).catch(() => {});
    setSaved(true);
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <h3 className={SECTION_TITLE}>Preferences</h3>
        <p className={HINT}>Saved to your account, so they follow you to any device.</p>
      </div>
      {error && <Alert tone="warning">Couldn&apos;t save that preference. Please try again.</Alert>}

      <section className="space-y-3">
        <span className={LABEL}>Appearance</span>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              aria-pressed={prefs.theme === t.value}
              onClick={() => void change("theme", t.value)}
              className={`inline-flex h-9 items-center rounded-[8px] border px-4 text-sm transition-colors ${
                prefs.theme === t.value
                  ? "border-[var(--brand)] bg-[var(--composer-chip)] text-[var(--brand)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--accent)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <span className={LABEL}>New videos start as</span>
        <div className="flex flex-wrap gap-2">
          {(["landscape", "portrait"] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={prefs.orientation === o}
              onClick={() => void change("orientation", o)}
              className={`inline-flex h-9 items-center rounded-[8px] border px-4 text-sm capitalize transition-colors ${
                prefs.orientation === o
                  ? "border-[var(--brand)] bg-[var(--composer-chip)] text-[var(--brand)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--accent)]"
              }`}
            >
              {o === "landscape" ? "Landscape (16:9)" : "Portrait (9:16)"}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <label className={LABEL} htmlFor="pref-voice">Default voice</label>
        <select
          id="pref-voice"
          className={FIELD}
          value={prefs.voiceId}
          onChange={(e) => void change("voiceId", e.target.value)}
          disabled={!voices.length}
        >
          <option value="">{voices.length ? "First available voice" : "Loading voices…"}</option>
          {voices.map((v) => (
            <option key={v.voice_id} value={v.voice_id}>
              {v.name}
              {v.language ? ` · ${v.language}` : ""}
            </option>
          ))}
        </select>
        <p className={HINT}>Pre-selected whenever you create a video. You can still change it each time.</p>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={LABEL} htmlFor="pref-speed">Default voice speed</label>
          <span className="text-sm text-[var(--muted-foreground)]">{prefs.speed.toFixed(1)}x</span>
        </div>
        <input
          id="pref-speed"
          type="range"
          min={0.5}
          max={1.5}
          step={0.1}
          value={prefs.speed}
          onChange={(e) => void change("speed", Number(e.target.value))}
          className="twin-slider h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--secondary)]"
          style={{ ["--pct" as string]: `${((prefs.speed - 0.5) / 1) * 100}%` }}
        />
      </section>

      <p className={HINT} aria-live="polite">{saving ? "Saving…" : saved ? "Saved." : ""}</p>
    </div>
  );
}
