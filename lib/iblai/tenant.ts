// Single-tenant app: the tenant is NEXT_PUBLIC_MAIN_TENANT_KEY, mirrored to
// localStorage (`app_tenant`); env always wins.

import config from "@/lib/iblai/config";

const PLACEHOLDER_PLATFORMS = new Set([
  "your-main-platform",
  "your-platform",
  "your-tenant",
  "your-tenant-key",
  "test-tenant",
  "main",
  "",
]);

export function resolveAppTenant(): string {
  if (typeof window === "undefined") {
    const envOnly = config.mainTenantKey();
    return envOnly && !PLACEHOLDER_PLATFORMS.has(envOnly) ? envOnly : "";
  }

  const envTenant = config.mainTenantKey();
  if (envTenant && !PLACEHOLDER_PLATFORMS.has(envTenant)) {
    try {
      if (localStorage.getItem("app_tenant") !== envTenant) {
        localStorage.setItem("app_tenant", envTenant);
      }
    } catch {
      /* private mode */
    }
    return envTenant;
  }

  try {
    const stored = localStorage.getItem("app_tenant") || localStorage.getItem("tenant") || "";
    return PLACEHOLDER_PLATFORMS.has(stored) ? "" : stored;
  } catch {
    return "";
  }
}

/** Another ibl.ai app on this origin left a different `tenant` behind: re-pin, and a non-member goes to the paywall. */
export function checkTenantMismatch(): boolean {
  if (typeof window === "undefined") return false;

  const appTenant = resolveAppTenant();
  const sdkTenant = localStorage.getItem("tenant") ?? "";

  if (appTenant && sdkTenant && sdkTenant !== appTenant) {
    localStorage.setItem("tenant", appTenant);
    localStorage.setItem("current_tenant", JSON.stringify({ key: appTenant }));
    if (!isTenantMember(readTenants(), appTenant)) {
      window.location.replace(PAYWALL_PATH);
      return true;
    }
  }
  return false;
}

export type TenantEntry = { key: string; is_admin?: boolean; [k: string]: unknown };

export function readTenants(): TenantEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem("tenants") ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const isTenantMember = (tenants: TenantEntry[], key: string) =>
  !!key && tenants.some((t) => t?.key === key);

export function dropTenant(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("tenants", JSON.stringify(readTenants().filter((t) => t?.key !== key)));
}

/** The access screen: paywall, checkout return, and the hand-off to the Auth SPA. */
export const PAYWALL_PATH = "/join";

export function paywallEntry({ member }: { member: boolean }): string | null {
  return member ? null : PAYWALL_PATH;
}

/** From the `tenants` list the sign-in stored, not the SDK's `useIsAdmin()`. */
export function isTenantAdmin(): boolean {
  return !!readTenants().find((t) => t.key === resolveAppTenant())?.is_admin;
}
