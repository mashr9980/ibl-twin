"use client";

/**
 * Tenant-level RBAC flags for the current user.
 *
 * vibe's NotificationDisplay and Account gate their admin surfaces (Alerts
 * tab, "+ New Notification", Users/Roles tabs) with
 * `checkRbacPermission(rbacPermissions, "/platforms/<key>/#can_x", enableRbac)`
 * — NOT with `isAdmin`. With `enableRbac` left false (the starter default and
 * what iblai/video ships) the check short-circuits to `true`, so every member
 * sees the admin UI and then hits 403s. This hydrates the flags the way the
 * vibe RBAC skill prescribes: POST rbac/permissions/check/ for the platform
 * resource, then pass the map through with enableRbac on.
 */

import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { selectRbacPermissions } from "@iblai/iblai-js/web-utils";

import config from "@/lib/iblai/config";

export type RbacPermissionMap = Record<string, Record<string, boolean>>;

type State = { permissions: RbacPermissionMap; ready: boolean };

const TTL_MS = 5 * 60 * 1000;
const cacheKey = (tenant: string) => `twin.rbac.${tenant}`;

/**
 * One request per tenant per page, even if two consumers mount together or
 * `isAdmin` resolves a tick after the tenant does. Without this the check
 * fired twice on every load.
 */
const inflight = new Map<string, Promise<RbacPermissionMap>>();

function readCache(tenant: string): RbacPermissionMap | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(tenant));
    if (!raw) return null;
    const { at, permissions } = JSON.parse(raw);
    return Date.now() - at < TTL_MS ? permissions : null;
  } catch {
    return null;
  }
}

function writeCache(tenant: string, permissions: RbacPermissionMap) {
  try {
    sessionStorage.setItem(cacheKey(tenant), JSON.stringify({ at: Date.now(), permissions }));
  } catch {}
}

/** Shape the platform returns, keyed by the resource we asked about. */
export async function fetchRbacPermissions(tenant: string, token: string): Promise<RbacPermissionMap> {
  const res = await fetch(`${config.dmUrl()}/api/core/rbac/permissions/check/`, {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ platform_key: tenant, resources: [`/platforms/${tenant}/`] }),
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
    [`/platforms/${tenant}/`]: {
      can_send_notifications: isAdmin,
      can_manage_users: isAdmin,
      can_invite: isAdmin,
    },
  };
}

/** How long to wait for TenantProvider's own load before fetching ourselves. */
const STORE_GRACE_MS = 1500;

export function useRbacPermissions(tenant: string, isAdmin: boolean): State {
  const fromStore = useSelector(selectRbacPermissions) as RbacPermissionMap;
  const storeHasTenant = !!tenant && !!fromStore?.[`/platforms/${tenant}/`];
  const [state, setState] = useState<State>({ permissions: {}, ready: false });
  // Read at failure time, not as an effect dependency: isAdmin resolving
  // late must not restart the fetch.
  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;

  useEffect(() => {
    if (!tenant || storeHasTenant) return;
    const cached = readCache(tenant);
    if (cached) {
      setState({ permissions: cached, ready: true });
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      let req = inflight.get(tenant);
      if (!req) {
        const token = localStorage.getItem("dm_token") ?? "";
        req = fetchRbacPermissions(tenant, token).finally(() => inflight.delete(tenant));
        inflight.set(tenant, req);
      }
      req
        .then((permissions) => {
          writeCache(tenant, permissions);
          if (!cancelled) setState({ permissions, ready: true });
        })
        .catch(() => {
          if (!cancelled) setState({ permissions: fallbackPermissions(tenant, isAdminRef.current), ready: true });
        });
    }, STORE_GRACE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tenant, storeHasTenant]);

  if (storeHasTenant) return { permissions: fromStore, ready: true };
  return state;
}
