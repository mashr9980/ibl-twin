"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NotificationDisplay } from "@iblai/iblai-js/web-containers";
import { resolveAppTenant } from "@/lib/iblai/tenant";
import { useRbacPermissions } from "@/hooks/use-rbac-permissions";

export default function NotificationsPage() {
  const params = useParams();
  const idParam = (params?.id as string[] | undefined) ?? undefined;
  const notificationId = idParam?.[0] ?? undefined;

  const [tenantKey, setTenantKey] = useState("");
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);
  const rbac = useRbacPermissions(tenantKey, isAdmin);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userData");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUsername(parsed.user_nicename ?? parsed.username ?? "");
      }
    } catch {}

    const resolved = resolveAppTenant();
    setTenantKey(resolved);

    try {
      const tenantsRaw = localStorage.getItem("tenants");
      if (tenantsRaw) {
        const parsed = JSON.parse(tenantsRaw);
        const match = parsed.find((t: any) => t.key === resolved);
        if (match) setIsAdmin(!!match.is_admin);
      }
    } catch {}

    setReady(true);
  }, []);

  if (!ready || !tenantKey || !rbac.ready) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-400">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div data-twin-notifications className="container mx-auto w-full max-w-4xl flex-1 px-4 py-6">
      <h1 className="mb-6 text-[24px] font-semibold tracking-[-0.6px] text-[var(--content-title)]">Notifications</h1>
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-card)]">
        <NotificationDisplay
          org={tenantKey}
          userId={username}
          isAdmin={isAdmin}
          enableRbac
          rbacPermissions={rbac.permissions}
          selectedNotificationId={notificationId}
        />
      </div>
    </div>
  );
}
