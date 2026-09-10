"use client";

// The member's own settings for this app, kept in the platform's per-user,
// per-platform metadata under the `twin` key, so they follow the account.

import { useCallback, useMemo } from "react";
import {
  useGetUserPlatformMetadataQuery,
  useUpdateUserPlatformMetadataMutation,
} from "@iblai/iblai-js/data-layer";

/** The locales the SDK ships catalogues for. */
export const LANGUAGES = [
  { value: "en", flag: "🇺🇸", label: "English" },
  { value: "fr", flag: "🇫🇷", label: "Français" },
  { value: "es", flag: "🇪🇸", label: "Español" },
  { value: "zh", flag: "🇨🇳", label: "中文" },
] as const;

export type Language = (typeof LANGUAGES)[number]["value"];
export type Theme = "light" | "dark" | "system";

/** What the member told us about themselves, for scripts and styling. */
export interface TwinProfile {
  use?: string;
  role: string;
  industry: string;
  audience: string;
  tone: string;
  topics: string;
}

export interface TwinBrand {
  primary: string;
  accent: string;
  font: string;
  voice: string;
}

export type GlossaryKind = "pronunciation" | "force_translate" | "dont_translate";

export interface GlossaryTerm {
  term: string;
  meaning: string;
  kind?: GlossaryKind;
}

export interface TwinPreferences {
  theme: Theme;
  language: Language;
  profile: TwinProfile | null;
  memory: string[];
  brand: TwinBrand | null;
  glossary: GlossaryTerm[];
}

export const DEFAULT_PREFERENCES: TwinPreferences = {
  theme: "system",
  language: "en",
  profile: null,
  memory: [],
  brand: null,
  glossary: [],
};

type Metadata = Record<string, unknown> & { twin?: Partial<TwinPreferences> };

export function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    if (theme === "system") localStorage.removeItem("theme");
    else localStorage.setItem("theme", theme);
  } catch {
    /* private mode */
  }
}

export function useTwinPreferences(tenantKey: string) {
  const signedIn = typeof window !== "undefined" && !!localStorage.getItem("dm_token");
  const query = useGetUserPlatformMetadataQuery({ tenantKey } as never, { skip: !tenantKey || !signedIn });
  const [update, state] = useUpdateUserPlatformMetadataMutation();

  const metadata = useMemo<Metadata>(
    () => ((query.data as { metadata?: Metadata } | undefined)?.metadata ?? {}) as Metadata,
    [query.data],
  );

  const prefs = useMemo<TwinPreferences>(() => ({ ...DEFAULT_PREFERENCES, ...metadata.twin }), [metadata]);

  // The platform replaces top-level metadata keys, so the whole `twin` object goes with every save.
  const save = useCallback(
    async (patch: Partial<TwinPreferences>) => {
      const next: Metadata = { ...metadata, twin: { ...metadata.twin, ...patch } };
      await update({ tenantKey, metadata: next } as never).unwrap();
    },
    [metadata, tenantKey, update],
  );

  return { prefs, save, loading: query.isLoading, saving: state.isLoading, error: state.isError };
}
