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

import {
  fallbackPermissions,
  fetchRbacPermissions,
  platformResource,
  readCache,
  writeCache,
  type RbacPermissionMap,
} from "@/lib/rbac/permissions";

export { fallbackPermissions, fetchRbacPermissions, type RbacPermissionMap };

type State = { permissions: RbacPermissionMap; ready: boolean };

/**
 * One request per tenant per page, even if two consumers mount together or
 * `isAdmin` resolves a tick after the tenant does.
 */
const inflight = new Map<string, Promise<RbacPermissionMap>>();

/** How long to wait for TenantProvider's own load before fetching ourselves. */
const STORE_GRACE_MS = 1500;

export function useRbacPermissions(tenant: string, isAdmin: boolean): State {
  const fromStore = useSelector(selectRbacPermissions) as RbacPermissionMap;
  const storeHasTenant = !!tenant && !!fromStore?.[platformResource(tenant)];
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
        .then((permissions: RbacPermissionMap) => {
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
