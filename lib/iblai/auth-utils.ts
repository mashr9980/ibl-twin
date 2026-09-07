
/**
 * ibl.ai auth helper utilities.
 *
 * These are thin wrappers used by IblaiProviders. You can customise the
 * redirect behaviour here without touching the provider component.
 */

import config from "./config";
import { resolveAppTenant } from "./tenant";
import {
  attemptAutoAccess,
  beginRecovery,
  clearFailedTenantJoin,
  currentUserEmail,
  endRecovery,
  hasFailedTenantJoin,
  isRecovering,
  loginNoticeUrl,
  recoverySucceeded,
} from "./access";

/** Check if running inside a Tauri app. */
export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
}

/** Check if running inside a Tauri mobile app (iOS/Android). */
export function isTauriMobile(): boolean {
  if (!isTauri()) return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Get the redirect origin for the Auth SPA.
 *  - Mobile Tauri: custom scheme (e.g. `iblai-skills://`)
 *  - Desktop Tauri / Web: window.location.origin
 */
function getRedirectOrigin(): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (isTauriMobile()) {
    const scheme = config.tauriCustomScheme();
    if (scheme) return `${scheme}://`;
  }
  return origin;
}

/**
 * Send a signed-out visitor to the branded sign-in screen first.
 *
 * The Auth SPA is where the session is actually issued, but jumping straight
 * there means the first thing anyone sees is ibl.ai's generic login rather
 * than this app. /login renders the branded screen and hands off from there.
 * Logout still goes direct, since there is nothing to brand on the way out.
 */
export async function redirectToAuthSpa(
  redirectTo?: string,
  platformKey?: string,
  logout?: boolean,
  saveRedirect?: boolean,
) {
  if (typeof window !== "undefined" && (isRecovering() || recoverySucceeded())) return;

  const redirectOrigin = getRedirectOrigin();
  const path = redirectTo ?? (typeof window !== "undefined" ? window.location.pathname : "/");

  if (saveRedirect) {
    localStorage.setItem("redirectTo", path);
  }

  const tenant = platformKey || resolveAppTenant();

  // A refused tenant join sends the user back here to sign in again, which on
  // its own just loops. Break out and explain instead.
  if (typeof window !== "undefined" && hasFailedTenantJoin(tenant)) {
    const email = currentUserEmail();
    clearFailedTenantJoin(tenant);

    // The session is still valid at this point, so if the invitation lands the
    // membership check passes on a plain reload.
    beginRecovery();
    if (await attemptAutoAccess(email, tenant, "not_a_member")) {
      window.location.replace("/");
      return;
    }
    endRecovery();

    localStorage.clear();
    window.location.href = loginNoticeUrl("no_access", email);
    return;
  }

  if (!logout && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
    return;
  }

  let authUrl = `${config.authUrl()}/login?app=custom&redirect-to=${redirectOrigin}`;
  if (tenant) authUrl += `&tenant=${encodeURIComponent(tenant)}`;
  if (logout) authUrl += "&logout=1";

  window.location.href = authUrl;
}

/** Check whether a non-expired auth token exists in localStorage. */
export function hasNonExpiredAuthToken(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("axd_token");
  if (!token) return false;
  const expiry = localStorage.getItem("axd_token_expires");
  if (!expiry) return false;
  return new Date(expiry) > new Date();
}

/** Handle logout: clear state and redirect to the Auth SPA logout page. */
export function handleLogout() {
  const tenant = resolveAppTenant();
  const redirectOrigin = getRedirectOrigin();
  localStorage.clear();
  window.location.href = `${config.authUrl()}/logout?redirect-to=${redirectOrigin}&tenant=${encodeURIComponent(tenant)}`;
}
