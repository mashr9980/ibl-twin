// SDK auth failures arrive as free text; they are mapped to a notice code
// here. "Not a member" means the paywall, the rest a fresh sign-in.

export type NoticeCode = "no_access" | "other_workspace" | "session_expired" | "error";

const GUARD_PREFIX = "tenant_access_attempt_";

export const NOTICE_PARAM = "notice";
export const EMAIL_PARAM = "email";

const NOTICE_CODES = new Set<string>(["no_access", "other_workspace", "session_expired", "error"]);

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

export const isMembershipNotice = (code: NoticeCode) =>
  code === "no_access" || code === "other_workspace";

/** The SDK sets this guard before bouncing a refused non-member back to sign-in. */
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
  return `/join?${params.toString()}`;
}
