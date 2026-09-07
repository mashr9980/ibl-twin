"use client";

import { getAuthSpaJoinUrl } from "@iblai/iblai-js/web-utils";

import config from "./config";
import { resolveAppTenant } from "./tenant";

/**
 * Sign-up URL scoped to this app's tenant. The bare ibl.ai/join flow enrols
 * people on the `main` platform and drops them on ibl.ai, so it never reaches
 * this workspace.
 */
export function tenantSignupUrl(): string {
  if (typeof window === "undefined") return "";
  const tenant = resolveAppTenant();
  if (!tenant) return "";
  try {
    return getAuthSpaJoinUrl(config.authUrl(), tenant, window.location.origin);
  } catch {
    return "";
  }
}
