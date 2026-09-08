"use client";

// Kept first: silences the SDK's token logging in production.
import "@/lib/twin/silence-console";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { usePathname } from "next/navigation";
import { initializeDataLayer, type TokenResponse } from "@iblai/iblai-js/data-layer";

import { PreferencesProvider } from "@/components/twin/preferences-provider";
import {
  AuthProvider,
  TenantProvider,
  syncAuthToCookies,
  updateRbacPermissions,
} from "@iblai/iblai-js/web-utils";

import { iblaiStore } from "@/store/iblai-store";
import { LocalStorageService } from "@/lib/iblai/storage-service";
import config from "@/lib/iblai/config";
import {
  PAYWALL_PATH,
  checkTenantMismatch,
  isTenantMember,
  readTenants,
  resolveAppTenant,
} from "@/lib/iblai/tenant";
import { redirectToAuthSpa, saveReturnPath } from "@/lib/iblai/auth-utils";
import {
  classifyAuthFailure,
  clearFailedTenantJoin,
  currentUserEmail,
  hasFailedTenantJoin,
  isMembershipNotice,
  loginNoticeUrl,
  type NoticeCode,
} from "@/lib/iblai/access";

const storageService = LocalStorageService.getInstance();

/** Routes that render without a session. */
const PUBLIC_ROUTES = new Map<RegExp, () => Promise<boolean>>([
  [new RegExp("^/sso-login"), async () => false],
  [new RegExp("^/join"), async () => false],
  [new RegExp("^/(privacy|terms|faq)"), async () => false],
]);

const isPublicPath = (pathname: string) =>
  pathname.startsWith("/sso-login") ||
  pathname.startsWith("/join") ||
  pathname.startsWith("/privacy") ||
  pathname.startsWith("/terms") ||
  pathname.startsWith("/faq");

/**
 * Members of the tenant get in, nobody else. Signed out → the Auth SPA.
 * Signed in but not a member → the paywall, where paying makes them a member.
 */
export function IblaiProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Synchronous, before any child can fire a query.
  const [isInitialized] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      initializeDataLayer(
        config.dmUrl(),
        config.lmsUrl(),
        config.legacyLmsUrl(),
        storageService,
        {
          401: () => redirectToAuthSpa(undefined, undefined, true),
        },
      );
    } catch (e) {
      console.error("[ibl.ai] initializeDataLayer failed:", e);
    }
    return true;
  });

  // Server and first client render both produce LOADING (no hydration mismatch).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [authNotice, setAuthNotice] = useState<NoticeCode | null>(null);

  const username = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("userData");
      if (raw) return JSON.parse(raw).user_nicename ?? "";
    } catch {
      /* ignore */
    }
    return "";
  }, [isInitialized]);

  const tenantKey = useMemo(() => resolveAppTenant(), [isInitialized]);

  const isSsoRoute = isPublicPath(pathname ?? "/");

  const sendToPaywall = () => {
    clearFailedTenantJoin(tenantKey);
    saveReturnPath("/");
    window.location.assign(PAYWALL_PATH);
  };

  useEffect(() => {
    if (!authNotice) return;
    if (window.location.pathname.startsWith(PAYWALL_PATH)) return;
    if (isMembershipNotice(authNotice)) {
      sendToPaywall();
      return;
    }
    const email = currentUserEmail();
    localStorage.clear();
    window.location.replace(loginNoticeUrl(authNotice, email));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authNotice]);

  /**
   * Every redirect the SDK asks for. A refused non-member goes to the paywall.
   * A request to switch a member of this tenant to another tenant is cookie
   * drift from the SDK's cross-app sync, not a switch: resync and stay.
   */
  const authRedirect = async (
    redirectTo?: string,
    platformKey?: string,
    logout?: boolean,
    saveRedirect?: boolean,
  ) => {
    const signedIn = !!localStorage.getItem("dm_token");
    const member = isTenantMember(readTenants(), tenantKey);
    if (signedIn && !member && hasFailedTenantJoin(tenantKey)) {
      sendToPaywall();
      return;
    }
    if (signedIn && member && !logout && platformKey && platformKey !== tenantKey) {
      console.warn("[auth] ignoring a switch to", platformKey, "— this session is a member here");
      await syncAuthToCookies(storageService);
      return;
    }
    await redirectToAuthSpa(redirectTo, platformKey, logout, saveRedirect);
  };

  const LOADING = (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  );

  if (!isInitialized || !mounted) return LOADING;
  if (authNotice && !isSsoRoute) return LOADING;

  return (
    <ReduxProvider store={iblaiStore}>
      <AuthProvider
        skip={isSsoRoute}
        redirectToAuthSpa={authRedirect}
        username={username}
        pathname={pathname ?? "/"}
        storageService={storageService}
        middleware={PUBLIC_ROUTES}
        enableStorageSync
        fallback={LOADING}
      >
        <TenantProvider
          onLoadPlatformPermissions={(permissions) => {
            if (permissions) {
              iblaiStore.dispatch(
                updateRbacPermissions(
                  permissions as unknown as Parameters<typeof updateRbacPermissions>[0],
                ),
              );
            }
          }}
          skip={isSsoRoute}
          currentTenant={tenantKey}
          requestedTenant={tenantKey}
          // Stored in the SDK's shape and mirrored to its cookies at once, so
          // the SDK's cross-app sync never sees storage and cookies disagree.
          saveCurrentTenant={(t: any) => {
            const key = typeof t === "string" ? t : (t?.key ?? String(t));
            const record = typeof t === "object" && t ? { ...t, key } : { key };
            localStorage.setItem("current_tenant", JSON.stringify(record));
            localStorage.setItem("tenant", key);
            void syncAuthToCookies(storageService);
            checkTenantMismatch();
          }}
          saveUserTenants={(t: unknown) => {
            localStorage.setItem("tenants", JSON.stringify(t));
            void syncAuthToCookies(storageService);
          }}
          saveUserTokens={(tokens: TokenResponse) => {
            if (tokens?.axd_token) {
              localStorage.setItem("axd_token", tokens.axd_token.token);
              localStorage.setItem("axd_token_expires", tokens.axd_token.expires);
            }
            if (tokens?.dm_token) {
              localStorage.setItem("dm_token", tokens.dm_token.token);
              localStorage.setItem("dm_token_expires", tokens.dm_token.expires);
            }
          }}
          saveTenant={(t: string) => localStorage.setItem("tenant", t)}
          onAuthFailure={(reason: string) => {
            console.error("[TenantProvider] Auth failure:", reason);
            setAuthNotice(classifyAuthFailure(reason));
          }}
          // A switch to another tenant means "not a member here": the paywall.
          handleTenantSwitch={async (requested?: unknown) => {
            const appTenant = resolveAppTenant();
            const target = typeof requested === "string" ? requested : "";
            if (target && appTenant && target !== appTenant) {
              console.warn("[TenantProvider] Tenant switch refused:", target);
              setAuthNotice("other_workspace");
              return;
            }
            void redirectToAuthSpa(undefined, appTenant, false, true);
          }}
          redirectToAuthSpa={authRedirect}
          username={username}
          fallback={LOADING}
        >
          <PreferencesProvider>{children}</PreferencesProvider>
        </TenantProvider>
      </AuthProvider>
    </ReduxProvider>
  );
}
