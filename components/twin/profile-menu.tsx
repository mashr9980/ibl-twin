"use client";

/**
 * Bottom-of-sidebar profile row and its popover.
 *
 * Mirrors twin.memorare.ai: a 30px avatar + username + unread badge opens a
 * ~336px popover headed by the signed-in email, with Settings, Dark mode,
 * Notifications, Help & FAQ and Log Out.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CircleHelp,
  LogOut,
  Moon,
  SlidersHorizontal,
} from "lucide-react";

import { NotificationsPanel } from "@/components/twin/notifications-panel";
import { ProfileSettingsDialog } from "@/components/twin/profile-settings-dialog";
import { cn } from "@/lib/utils";
import { TwinLogo } from "./app-sidebar";

export function ProfileMenu({
  email,
  username,
  unread = 0,
  collapsed = false,
  onLogout,
}: {
  email: string;
  username: string;
  unread?: number;
  collapsed?: boolean;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState<"menu" | "notifications">("menu");
  const [dark, setDark] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Skip the first run. On mount `dark` is still the initial `false`, so
  // applying it would strip the class the pre-paint script just set and the
  // page would snap back to light after hydration.
  const applied = useRef(false);
  useEffect(() => {
    if (!applied.current) {
      applied.current = true;
      return;
    }
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      /* private mode: the class still applies for this session */
    }
  }, [dark]);

  const initial = (username || email || "?").charAt(0).toUpperCase();

  const row =
    "flex w-full items-center gap-2.5 rounded-[var(--radius-control)] px-2 py-2 text-[13.5px] text-[var(--content-title)] transition-colors hover:bg-[var(--canvas-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]";

  return (
    <>
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setView("menu"); }}
        aria-expanded={open}
        aria-haspopup="menu"
        title={collapsed ? email : undefined}
        className={cn(
          "flex h-9 w-full min-w-0 items-center gap-2 rounded-[5px] px-2 text-left text-[14px] font-normal text-[var(--sidebar-foreground)] transition-colors hover:bg-[var(--sidebar-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]",
          collapsed && "justify-center",
        )}
      >
        <span className="relative flex size-8 shrink-0 overflow-hidden rounded-[5px] border border-[var(--border)] bg-[var(--card)]" aria-hidden="true">
          <img src="/images/user-profile.png" alt="" className="aspect-square size-full object-cover object-center" />
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1 truncate text-left text-[14px] font-normal">{username || email}</span>
        )}
        {!collapsed && unread > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-transparent bg-[#2563EB] px-1.5 py-0 text-[10px] font-semibold leading-none text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-[336px] max-w-[calc(100vw-2rem)] rounded-[var(--radius-pill)] border border-[var(--border)] bg-[var(--popover)] p-2 shadow-[var(--shadow-popover)]"
        >
          {view === "notifications" ? (
            <NotificationsPanel username={username} onBack={() => setView("menu")} />
          ) : (
            <>
          <p className="truncate px-2 pb-2 pt-1 text-[13px] text-[var(--content-caption)]">
            {email}
          </p>

          <button
            type="button"
            role="menuitem"
            className={row}
            onClick={() => { setOpen(false); setSettingsOpen(true); }}
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} />
            Settings
          </button>

          <div className={cn(row, "cursor-default hover:bg-transparent")}>
            <Moon size={16} strokeWidth={1.75} />
            <span className="flex-1 text-left">Dark mode</span>
            <button
              type="button"
              role="switch"
              aria-checked={dark}
              aria-label="Dark mode"
              onClick={() => setDark((v) => !v)}
              className={cn(
                "relative h-5 w-9 flex-none rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]",
                dark ? "bg-[var(--brand)]" : "bg-[var(--border)]",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]",
                  dark ? "left-[1.125rem]" : "left-0.5",
                )}
              />
            </button>
          </div>

          <button
            type="button"
            role="menuitem"
            className={row}
            onClick={() => setView("notifications")}
          >
            <Bell size={16} strokeWidth={1.75} />
            Notifications
          </button>

          <Link href="/faq" target="_blank" rel="noopener noreferrer" role="menuitem" className={row} onClick={() => setOpen(false)}>
            <CircleHelp size={16} strokeWidth={1.75} />
            Help &amp; FAQ
          </Link>

          <button type="button" role="menuitem" className={row} onClick={onLogout}>
            <LogOut size={16} strokeWidth={1.75} />
            Log Out
          </button>

          <div className="flex justify-end px-2 pb-1 pt-2">
            <TwinLogo />
          </div>
            </>
          )}
        </div>
      )}
    </div>
      <ProfileSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        username={username}
        email={email}
      />
    </>
  );
}
