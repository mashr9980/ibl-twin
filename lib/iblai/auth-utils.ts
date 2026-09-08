// The Auth SPA (login.<domain>) issues every session and returns to
// <origin>/sso-login-complete?data=<tokens>, which SsoLogin stores.

import config from "./config";
import { resolveAppTenant } from "./tenant";

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

export function isTauriMobile(): boolean {
  if (!isTauri()) return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Mobile Tauri returns through a custom scheme; everything else through the page origin. */
export function getRedirectOrigin(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (isTauriMobile()) {
    const scheme = config.tauriCustomScheme();
    if (scheme) return `${scheme}://`;
  }
  return origin;
}

export const authLoginUrl = (origin: string, tenant: string, email = "") =>
  `${config.authUrl()}/login?app=custom&redirect-to=${origin}` +
  (tenant ? `&tenant=${encodeURIComponent(tenant)}` : "") +
  (email ? `&email=${encodeURIComponent(email)}` : "");

/** Sign-up on the Auth SPA; no tenant, since self-join is closed and the paywall takes over on return. */
export const authSignupUrl = (origin: string) =>
  `${config.authUrl()}/signup?app=custom&redirect-to=${origin}`;

/** The localStorage key SsoLogin reads (then clears) to know where to land. */
export const RETURN_PATH_KEY = "redirectTo";

const NOT_A_DESTINATION = /^\/(join|login|sso-login|sso-login-complete)(\/|\?|$)/;

export function saveReturnPath(path: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RETURN_PATH_KEY, NOT_A_DESTINATION.test(path) ? "/" : path);
}

export function readReturnPath(): string {
  if (typeof window === "undefined") return "/";
  const saved = localStorage.getItem(RETURN_PATH_KEY) ?? "";
  return saved && !NOT_A_DESTINATION.test(saved) ? saved : "/";
}

export async function redirectToAuthSpa(
  redirectTo?: string,
  platformKey?: string,
  logout?: boolean,
  saveRedirect?: boolean,
) {
  if (typeof window === "undefined") return;

  const redirectOrigin = getRedirectOrigin();
  const path = redirectTo ?? window.location.pathname + window.location.search;
  if (saveRedirect) saveReturnPath(path);

  const tenant = platformKey || resolveAppTenant();

  let authUrl = authLoginUrl(redirectOrigin, tenant);
  if (logout) authUrl += "&logout=1";
  window.location.href = authUrl;
}

export function hasLiveDmToken(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("dm_token");
  if (!token) return false;
  const expiry = localStorage.getItem("dm_token_expires");
  return !expiry || new Date(expiry) > new Date();
}

export function hasNonExpiredAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("axd_token");
  if (!token) return false;
  const expiry = localStorage.getItem("axd_token_expires");
  if (!expiry) return false;
  return new Date(expiry) > new Date();
}

export function handleLogout() {
  const tenant = resolveAppTenant();
  const redirectOrigin = getRedirectOrigin();
  localStorage.clear();
  try {
    sessionStorage.clear();
  } catch {
    /* private mode */
  }
  window.location.href = `${config.authUrl()}/logout?redirect-to=${redirectOrigin}&tenant=${encodeURIComponent(tenant)}`;
}
