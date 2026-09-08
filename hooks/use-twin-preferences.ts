"use client";

// The member's own settings for this app, kept in the platform's per-user,
// per-platform metadata under the `twin` key, so they follow the account.

import { useCallback, useMemo } from "react";
import {
  useGetUserPlatformMetadataQuery,
  useUpdateUserPlatformMetadataMutation,
} from "@iblai/iblai-js/data-layer";

export type Theme = "light" | "dark" | "system";
export type ShowMeAs = "email" | "username" | "name";

export interface TwinPreferences {
  theme: Theme;
  orientation: "landscape" | "portrait";
  voiceId: string;
  speed: number;
  showMeAs: ShowMeAs;
}

export const DEFAULT_PREFERENCES: TwinPreferences = {
  theme: "system",
  orientation: "landscape",
  voiceId: "",
  speed: 1,
  showMeAs: "email",
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
  const query = useGetUserPlatformMetadataQuery({ tenantKey } as never, { skip: !tenantKey });
  const [update, state] = useUpdateUserPlatformMetadataMutation();
  const metadata = useMemo<Metadata>(
    () => ((query.data as { metadata?: Metadata } | undefined)?.metadata ?? {}) as Metadata,
    [query.data],
  );

  const prefs = useMemo<TwinPreferences>(() => ({ ...DEFAULT_PREFERENCES, ...metadata.twin }), [metadata]);

  const save = useCallback(
    async (patch: Partial<TwinPreferences>) => {
      const next: Metadata = { ...metadata, twin: { ...metadata.twin, ...patch } };
      await update({ tenantKey, metadata: next } as never).unwrap();
    },
    [metadata, tenantKey, update],
  );

  return { prefs, save, loading: query.isLoading, saving: state.isLoading, error: state.isError };
}
