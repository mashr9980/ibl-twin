"use client";

/**
 * Twin's "Profile settings" dialog. The SDK's own Account component renders
 * the tenant admin surface instead, so this is a rebuild. Avatar, name, email
 * and Log out are live; the rest render as twin does but are disabled.
 */

import { useEffect, useRef, useState } from "react";
import {
  Building2, Code, CreditCard, History, Link2, Palette, Puzzle,
  Settings as SettingsIcon, Shield, Sparkles, User, X,
} from "lucide-react";

import { handleLogout } from "@/lib/iblai/auth-utils";
import { cn } from "@/lib/utils";

type Section = "account";

const PROFILE_NAV = [
  { key: "account" as Section, label: "Account", icon: User, enabled: true },
  { key: "preferences", label: "Preferences", icon: SettingsIcon, enabled: false },
  { key: "personalization", label: "Personalization", icon: Palette, enabled: false },
];

const WORKSPACE_NAV = [
  { key: "general", label: "General", icon: Building2 },
  { key: "billing", label: "Plan & Billing", icon: CreditCard },
  { key: "usage", label: "Usage & History", icon: History },
  { key: "security", label: "Security", icon: Shield },
  { key: "api", label: "API", icon: Code },
  { key: "skills", label: "Agentic Skills", icon: Sparkles },
  { key: "connections", label: "Connections", icon: Puzzle },
];

const NAV_ITEM =
  "flex w-full min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] font-normal transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-40 sm:min-h-0 sm:py-2";
const NAV_ACTIVE = "bg-[#eef6fc] text-[#38A1E5] dark:bg-[rgb(15_45_72_/_0.92)] dark:text-[#5ec4ff]";
const GROUP_LABEL = "px-1 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]";
const OUTLINE_BTN =
  "inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-normal text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-50";
const FIELD =
  "flex h-10 w-full rounded-[8px] border border-[var(--input)] bg-[var(--background)] px-3 py-2 text-base leading-snug text-[var(--content-title)] shadow-sm outline-none placeholder:text-[11px] placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50 sm:text-[13px]";
const LABEL = "flex select-none items-center gap-2 text-sm font-medium text-[var(--foreground)]";

export function ProfileSettingsDialog({
  open,
  onClose,
  username,
  email,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
  email: string;
}) {
  const [section] = useState<Section>("account");
  const [first, setFirst] = useState(username);
  const [last, setLast] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);
  const photo = useRef<HTMLInputElement>(null);

  useEffect(() => setFirst(username), [username]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Profile settings">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" />

      <div className="relative flex h-[min(88dvh,720px)] w-[min(calc(100vw-2rem),1040px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-md">
        <div className="flex h-full min-h-0 flex-1 flex-col sm:flex-row">
          <aside className="hidden min-h-0 flex-col border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] sm:flex sm:h-full sm:w-[240px] sm:shrink-0 sm:border-r sm:px-4 sm:py-5 lg:w-[260px]">
            <div className="space-y-5">
              <div className="space-y-1">
                <p className={GROUP_LABEL}>Profile settings</p>
                <ul className="flex flex-col gap-0.5">
                  {PROFILE_NAV.map(({ key, label, icon: Icon, enabled }) => (
                    <li key={key}>
                      <button
                        type="button"
                        disabled={!enabled}
                        title={enabled ? undefined : "Not available in this build"}
                        className={cn(NAV_ITEM, section === key ? NAV_ACTIVE : "text-[var(--foreground)]")}
                      >
                        <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                        <span className="truncate">{label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1">
                <p className={GROUP_LABEL}>Workspace settings</p>
                <ul className="flex flex-col gap-0.5">
                  {WORKSPACE_NAV.map(({ key, label, icon: Icon }) => (
                    <li key={key}>
                      <button type="button" disabled title="Not available in this build" className={cn(NAV_ITEM, "text-[var(--foreground)]")}>
                        <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                        <span className="truncate">{label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-7">
            <div className="w-full space-y-8">
              <section className="space-y-3">
                <label className={LABEL}>Profile Picture</label>
                <div className="flex items-center gap-4 sm:gap-5">
                  <span className="relative flex size-20 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card)]">
                    <img src="/images/user-profile.png" alt={username} className="aspect-square h-full w-full object-cover" />
                  </span>
                  <div className="min-w-0 space-y-1.5">
                    <input ref={photo} type="file" accept="image/*" className="sr-only" />
                    <button type="button" disabled title="Not available in this build" className={OUTLINE_BTN}>Upload photo</button>
                    <p className="text-xs text-[var(--muted-foreground)]">Pick a photo up to 4MB.</p>
                  </div>
                </div>
              </section>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className={LABEL} htmlFor="settings-first-name">First Name</label>
                  <input id="settings-first-name" className={FIELD} value={first} onChange={(e) => setFirst(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className={LABEL} htmlFor="settings-last-name">Last Name</label>
                  <input id="settings-last-name" className={FIELD} value={last} onChange={(e) => setLast(e.target.value)} />
                </div>
              </div>

              <section className="space-y-3">
                <label className={LABEL}>Email</label>
                <p className="text-sm text-[var(--muted-foreground)]">{email}</p>
                <button type="button" disabled title="Not available in this build" className={OUTLINE_BTN}>Change email</button>
              </section>

              <section className="space-y-3">
                <label className={LABEL}>Password</label>
                <button type="button" disabled title="Not available in this build" className={OUTLINE_BTN}>Create password</button>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className={LABEL}>2-factor authentication</label>
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm text-[var(--muted-foreground)]">{twoFactor ? "On" : "Off"}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={twoFactor}
                      aria-label="Toggle two-factor authentication"
                      disabled
                      title="Not available in this build"
                      onClick={() => setTwoFactor((v) => !v)}
                      className={cn(
                        "inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all disabled:cursor-not-allowed disabled:opacity-50",
                        twoFactor ? "bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)]" : "bg-[var(--input)]",
                      )}
                    >
                      <span className={cn("pointer-events-none block size-4 rounded-full bg-[var(--background)] transition-transform", twoFactor && "translate-x-[calc(100%-2px)] bg-white")} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">2FA is disabled on your account.</p>
              </section>

              <div className="border-t border-[var(--border)] pt-8">
                <section className="space-y-3">
                  <label className={LABEL}>Connected accounts</label>
                  <button type="button" disabled title="Not available in this build" className={cn(OUTLINE_BTN, "gap-2")}>Disconnect Google</button>
                </section>
              </div>

              <div className="border-t border-[var(--border)] pt-8">
                <div className="flex flex-wrap gap-3">
                  <button type="button" disabled title="Not available in this build"
                    className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] border-0 bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)] px-4 py-2 text-sm font-normal text-white shadow-none transition-all hover:brightness-[0.96] disabled:pointer-events-none disabled:opacity-50">
                    Delete Account
                  </button>
                  <button type="button" onClick={handleLogout} className={OUTLINE_BTN}>Log out</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100">
          <X className="size-4" strokeWidth={2} aria-hidden />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  );
}
