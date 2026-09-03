/**
 * Pure helpers for tenant RBAC flags. No React, no SDK imports, so they can be
 * unit-tested in Node and shared by the hook and any server code later.
 */

import config from "@/lib/iblai/config";

export type RbacPermissionMap = Record<string, Record<string, boolean>>;

export const platformResource = (tenant: string) => `/platforms/${tenant}/`;

/** Shape the platform returns, keyed by the resource we asked about. */
export async function fetchRbacPermissions(tenant: string, token: string): Promise<RbacPermissionMap> {
  const res = await fetch(`${config.dmUrl()}/api/core/rbac/permissions/check/`, {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ platform_key: tenant, resources: [platformResource(tenant)] }),
  });
  if (!res.ok) throw new Error(`rbac check ${res.status}`);
  return (await res.json()) as RbacPermissionMap;
}

/**
 * If the check itself fails we fall back to the tenant's `is_admin` flag so a
 * transient error doesn't strip an admin of their tools. Members stay closed.
 */
export function fallbackPermissions(tenant: string, isAdmin: boolean): RbacPermissionMap {
  return {
    [platformResource(tenant)]: {
      can_send_notifications: isAdmin,
      can_manage_users: isAdmin,
      can_invite: isAdmin,
    },
  };
}

const TTL_MS = 5 * 60 * 1000;
const cacheKey = (tenant: string) => `twin.rbac.${tenant}`;

export function readCache(tenant: string): RbacPermissionMap | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(tenant));
    if (!raw) return null;
    const { at, permissions } = JSON.parse(raw);
    return Date.now() - at < TTL_MS ? permissions : null;
  } catch {
    return null;
  }
}

export function writeCache(tenant: string, permissions: RbacPermissionMap) {
  try {
    sessionStorage.setItem(cacheKey(tenant), JSON.stringify({ at: Date.now(), permissions }));
  } catch {}
}
