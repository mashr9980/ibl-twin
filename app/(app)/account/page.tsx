"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Account } from "@iblai/iblai-js/web-containers/next";
import config from "@/lib/iblai/config";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { InviteDialog } from "@/components/twin/invite-dialog";
import { useRbacPermissions } from "@/hooks/use-rbac-permissions";

export default function AccountPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [tenantKey, setTenantKey] = useState("");
  const [tenants, setTenants] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const rbac = useRbacPermissions(tenantKey, isAdmin);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userData");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUsername(parsed.user_nicename ?? parsed.username ?? "");
        setEmail(parsed.user_email ?? parsed.email ?? "");
      }
    } catch {}

    const resolved = resolveAppTenant();
    setTenantKey(resolved);

    try {
      const tenantsRaw = localStorage.getItem("tenants");
      if (tenantsRaw) {
        const parsed = JSON.parse(tenantsRaw);
        setTenants(parsed);
        const match = parsed.find((t: any) => t.key === resolved);
        if (match) setIsAdmin(!!match.is_admin);
      }
    } catch {}

    setReady(true);
  }, []);

  if (!ready || !tenantKey) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-400">Loading account settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full flex-1 overflow-auto px-4 py-8 md:w-[75vw] md:px-0">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <Account
          tenant={tenantKey}
          tenants={tenants}
          username={username}
          email={email}
          mainPlatformKey={config.mainTenantKey()}
          isAdmin={isAdmin}
          enableRbac={rbac.ready}
          rbacPermissions={rbac.permissions}
          authURL={config.authUrl()}
          currentPlatformBaseDomain={config.platformBaseDomain()}
          currentSPA="agent"
          // vibe raises this and leaves the flow to the host app; the starter
          // and iblai/video both stub it, which is why Invite silently does nothing.
          onInviteClick={() => setInviteOpen(true)}
          onClose={() => router.push("/")}
          targetTab="organization"
          showPlatformName={true}
          useGravatarPicFallback={true}
        />
      </div>
      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
