"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { AppSidebar, SidebarNav, TwinLogo } from "@/components/twin/app-sidebar";
import { ProfileMenu } from "@/components/twin/profile-menu";
import { AppFooter } from "@/components/twin/app-footer";
import { handleLogout } from "@/lib/iblai/auth-utils";
import { resolveAppTenant } from "@/lib/iblai/tenant";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  // Escape closes the drawer, matching the modal and the profile menu.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userData");
      if (raw) {
        const u = JSON.parse(raw);
        setUsername(u.user_nicename ?? u.username ?? "");
        setEmail(u.user_email ?? u.email ?? "");
      }
    } catch {
      /* unauthenticated render — providers redirect before this matters */
    }
    // Touch the tenant resolver so a mismatch is caught on first paint.
    resolveAppTenant();
  }, []);

  const profile = (
    <ProfileMenu
      email={email}
      username={username}
      unread={0}
      collapsed={collapsed}
      onLogout={() => handleLogout()}
    />
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)]">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        profile={profile}
      />

      {/* Mobile drawer — the rail slides in over a dimmed scrim. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div
            style={{ width: "var(--sidebar-width)" }}
            className="absolute inset-y-0 left-0 flex flex-col border-r border-[var(--border)] bg-[var(--sidebar)]"
          >
            <div className="flex h-[66px] flex-none items-center justify-between px-3">
              <TwinLogo />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-[var(--content-caption)] hover:bg-[var(--canvas-muted)]"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            </div>
            <div className="flex-none border-t border-[var(--border)] p-2">{profile}</div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar, 66px, only below md. */}
        <div className="flex h-[66px] flex-none items-center gap-2 border-b border-[var(--border)] bg-[var(--background)] px-3 md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-[var(--content-title)] hover:bg-[var(--canvas-muted)]"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
          <TwinLogo />
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--canvas-muted)]">
          {children}
        </main>

        <AppFooter />
      </div>
    </div>
  );
}
