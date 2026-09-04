"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { AppSidebar, SidebarNav, TwinLogo } from "@/components/twin/app-sidebar";
import { ProfileMenu } from "@/components/twin/profile-menu";
import { cn } from "@/lib/utils";
import { AppFooter } from "@/components/twin/app-footer";
import { handleLogout } from "@/lib/iblai/auth-utils";
import { resolveAppTenant } from "@/lib/iblai/tenant";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
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
      {/* Kept mounted so the panel can slide; pointer events are off when shut. */}
      <div className={cn("fixed inset-0 z-50 md:hidden", !drawerOpen && "pointer-events-none")} aria-hidden={!drawerOpen}>
          <button
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
            tabIndex={drawerOpen ? 0 : -1}
            className={cn(
              "absolute inset-0 bg-black/40 transition-opacity duration-200 ease-linear",
              drawerOpen ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            style={{ width: "var(--sidebar-width)" }}
            className={cn(
              "absolute inset-y-0 left-0 flex flex-col border-r border-[var(--border)] bg-[var(--sidebar)] px-[10px] transition-transform duration-200 ease-linear",
              drawerOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="mb-0 flex h-[70px] w-full shrink-0 items-center justify-between gap-2 px-1">
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
            <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-2 pt-1">
              <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            </div>
            <div className="mt-auto w-full shrink-0 border-t border-[var(--sidebar-border)] px-0 py-2">{profile}</div>
          </div>
        </div>


      <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-[68.5px] shrink-0 items-center border-b border-[var(--border)] bg-[var(--card)] px-4 text-[var(--card-foreground)] sm:px-6 md:hidden">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open sidebar"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-[5px] border-0 bg-transparent text-[var(--muted-foreground)] shadow-none transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] md:hidden"
            >
              <Menu size={18} strokeWidth={1.75} />
            </button>
          </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--canvas-muted)]">
          {children}
        </main>

        <AppFooter />
      </div>
    </div>
  );
}
