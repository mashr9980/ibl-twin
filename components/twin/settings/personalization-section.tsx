"use client";

// Personalization: what the app calls you and your twin.

import { useEffect, useState } from "react";

import { Alert } from "@/components/twin/alert";
import { useTwinPreferences, type ShowMeAs } from "@/hooks/use-twin-preferences";
import { getTwin, setTwin, type LocalTwin } from "@/lib/twin/local-library";
import { FIELD, HINT, LABEL, PRIMARY_BTN, SECTION_TITLE } from "./ui";

const SHOW_AS: { value: ShowMeAs; label: string }[] = [
  { value: "email", label: "My email" },
  { value: "username", label: "My username" },
  { value: "name", label: "My name" },
];

export function PersonalizationSection({ tenantKey }: { tenantKey: string }) {
  const { prefs, save, saving, error } = useTwinPreferences(tenantKey);
  const [twin, setLocal] = useState<LocalTwin | null>(null);
  const [twinName, setTwinName] = useState("");
  const [notice, setNotice] = useState<{ tone: "info" | "warning"; text: string } | null>(null);

  useEffect(() => {
    getTwin()
      .then((t) => {
        setLocal(t);
        setTwinName(t?.name ?? "");
      })
      .catch(() => {});
  }, []);

  async function renameTwin() {
    if (!twin) return;
    const name = twinName.trim() || "My Twin";
    try {
      const next = { ...twin, name };
      await setTwin(next);
      setLocal(next);
      setTwinName(name);
      setNotice({ tone: "info", text: "Twin renamed." });
    } catch {
      setNotice({ tone: "warning", text: "Couldn't rename your twin. Please try again." });
    }
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <h3 className={SECTION_TITLE}>Personalization</h3>
        <p className={HINT}>Make the app yours.</p>
      </div>
      {(error || notice) && (
        <Alert tone={error ? "warning" : notice!.tone} onDismiss={() => setNotice(null)}>
          {error ? "Couldn't save that setting. Please try again." : notice!.text}
        </Alert>
      )}

      <section className="space-y-3">
        <span className={LABEL}>Show me in the sidebar as</span>
        <div className="flex flex-wrap gap-2">
          {SHOW_AS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={prefs.showMeAs === o.value}
              onClick={() => void save({ showMeAs: o.value }).catch(() => {})}
              className={`inline-flex h-9 items-center rounded-[8px] border px-4 text-sm transition-colors ${
                prefs.showMeAs === o.value
                  ? "border-[var(--brand)] bg-[var(--composer-chip)] text-[var(--brand)]"
                  : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--accent)]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className={HINT} aria-live="polite">{saving ? "Saving…" : ""}</p>
      </section>

      <section className="space-y-3">
        <label className={LABEL} htmlFor="twin-name">Your twin&apos;s name</label>
        {twin ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input id="twin-name" className={FIELD} value={twinName} onChange={(e) => setTwinName(e.target.value)} maxLength={60} />
            <button type="button" onClick={renameTwin} disabled={twinName.trim() === twin.name} className={PRIMARY_BTN}>
              Rename
            </button>
          </div>
        ) : (
          <p className={HINT}>You have no twin yet. Create one from Create Twin and name it here.</p>
        )}
        <p className={HINT}>Used in your video titles and on your twin&apos;s card.</p>
      </section>
    </div>
  );
}
