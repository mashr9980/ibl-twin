"use client";

// Carries the member's saved preferences into the app: the SDK's components
// speak their language, and their appearance choice follows them to any
// device (the pre-paint script only knows what this browser last used).

import { useEffect } from "react";
import { WebContainersI18nProvider } from "@iblai/iblai-js/web-containers";

import { applyTheme, useTwinPreferences } from "@/hooks/use-twin-preferences";
import { resolveAppTenant } from "@/lib/iblai/tenant";

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { prefs, loading } = useTwinPreferences(resolveAppTenant());

  useEffect(() => {
    if (!loading) applyTheme(prefs.theme);
  }, [loading, prefs.theme]);

  return <WebContainersI18nProvider locale={prefs.language}>{children}</WebContainersI18nProvider>;
}
