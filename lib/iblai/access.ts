/**
 * Auth failures reach us as free-text reasons from the SDK, and a failed
 * tenant join is only visible as the sessionStorage guard the SDK sets before
 * bouncing back to sign-in. Both are translated here into a notice code the
 * sign-in screen can explain.
 */

export type NoticeCode =
  | "no_access"
  | "other_workspace"
  | "session_expired"
  | "error";

const GUARD_PREFIX = "tenant_access_attempt_";

export const NOTICE_PARAM = "notice";
export const EMAIL_PARAM = "email";

const NOTICE_CODES = new Set<string>([
  "no_access",
  "other_workspace",
  "session_expired",
  "error",
]);

export function isNoticeCode(value: unknown): value is NoticeCode {
  return typeof value === "string" && NOTICE_CODES.has(value);
}

export function classifyAuthFailure(reason: string): NoticeCode {
  const text = reason.toLowerCase();
  if (text.includes("do not have access") || text.includes("does not belong")) {
    return "no_access";
  }
  if (text.includes("expired")) return "session_expired";
  return "error";
}

export function hasFailedTenantJoin(tenant: string): boolean {
  if (typeof window === "undefined" || !tenant) return false;
  try {
    return sessionStorage.getItem(GUARD_PREFIX + tenant) === "1";
  } catch {
    return false;
  }
}

export function clearFailedTenantJoin(tenant: string): void {
  if (typeof window === "undefined" || !tenant) return;
  try {
    sessionStorage.removeItem(GUARD_PREFIX + tenant);
  } catch {
    /* private mode */
  }
}

/** Read before a redirect: logging out clears localStorage. */
export function currentUserEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("userData");
    if (!raw) return "";
    return JSON.parse(raw).user_email ?? "";
  } catch {
    return "";
  }
}

export function loginNoticeUrl(code: NoticeCode, email = ""): string {
  const params = new URLSearchParams({ [NOTICE_PARAM]: code });
  if (email) params.set(EMAIL_PARAM, email);
  return `/login?${params.toString()}`;
}

export type PlatformAccessConfig = {
  allowSelfLinking: boolean;
};

/** Public endpoint, so the sign-in screen can explain access rules before login. */
export async function fetchPlatformAccessConfig(
  dmUrl: string,
  tenant: string,
  signal?: AbortSignal,
): Promise<PlatformAccessConfig | null> {
  if (!dmUrl || !tenant) return null;
  try {
    const url = `${dmUrl.replace(/\/$/, "")}/api/core/users/platforms/config/public/?platform_key=${encodeURIComponent(tenant)}`;
    const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    return { allowSelfLinking: data?.allow_self_linking === true };
  } catch {
    return null;
  }
}

const RECOVERY_PREFIX = "access_recovery_";

// The SDK keeps retrying while the recovery request is in flight, and one of
// those retries navigates to the Auth SPA. Suppress its redirects until we
// know whether the invitation worked, so our own navigation wins.
let recovering = false;

export function isRecovering(): boolean {
  return recovering;
}

export function beginRecovery(): void {
  recovering = true;
}

export function endRecovery(): void {
  recovering = false;
}

/**
 * One automatic attempt to get a refused visitor onto the tenant. The server
 * issues an invitation, which an existing ibl.ai account accepts immediately,
 * so the caller can simply reload and the SDK's membership check passes.
 * Guarded per email so a failure cannot become a reload loop.
 */
let inflight: Promise<boolean> | null = null;
let succeeded = false;

/** Once access is granted, no later path may tear the session back down. */
export function recoverySucceeded(): boolean {
  return succeeded;
}

export async function attemptAutoAccess(
  email: string,
  tenant: string,
  reason: string,
): Promise<boolean> {
  if (typeof window === "undefined" || !email || !tenant) return false;

  // Both the redirect interceptor and the provider react to the same refusal.
  // They must observe one shared outcome, or the loser tears down a session
  // the winner just rescued.
  if (inflight) return inflight;

  const key = RECOVERY_PREFIX + tenant + "_" + email;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {
    return false;
  }

  inflight = (async () => {
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tenant, reason }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.invited === true) {
        succeeded = true;
        clearFailedTenantJoin(tenant);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  })();

  return inflight;
}
