"use client";

/**
 * Twin's "Profile settings" dialog, laid out as twin.memorare.ai's: a section
 * rail on the left (a scrolling chip row on phones), and a pane headed by the
 * section's name. Profile settings are for every member, workspace settings
 * for admins.
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Building2, Code, CreditCard, History, Palette, Puzzle,
  Settings as SettingsIcon, Shield, Sparkles, User, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { AccountSection } from "@/components/twin/settings/account-section";
import { ApiSection } from "@/components/twin/settings/api-section";
import { PersonalizationSection } from "@/components/twin/settings/personalization-section";
import { PreferencesSection } from "@/components/twin/settings/preferences-section";
import { UsageSection } from "@/components/twin/settings/usage-section";
import { BillingSection } from "@/components/twin/settings/billing-section";
import { ConnectionsSection } from "@/components/twin/settings/connections-section";
import { GeneralSection } from "@/components/twin/settings/general-section";
import { SecuritySection } from "@/components/twin/settings/security-section";
import { SkillsSection } from "@/components/twin/settings/skills-section";
import { cn } from "@/lib/utils";

type Section =
  | "account" | "preferences" | "personalization"
  | "general" | "billing" | "usage" | "security" | "api" | "skills" | "connections";

type NavItem = { key: Section; label: string; icon: LucideIcon; adminOnly?: boolean };

const PROFILE_NAV: NavItem[] = [
  { key: "account", label: "Account", icon: User },
  { key: "preferences", label: "Preferences", icon: SettingsIcon },
  { key: "personalization", label: "Personalization", icon: Palette },
];

const WORKSPACE_NAV: NavItem[] = [
  { key: "general", label: "General", icon: Building2, adminOnly: true },
  { key: "billing", label: "Plan & Billing", icon: CreditCard, adminOnly: true },
  { key: "usage", label: "Usage & History", icon: History },
  { key: "security", label: "Security", icon: Shield, adminOnly: true },
  { key: "api", label: "API", icon: Code, adminOnly: true },
  { key: "skills", label: "Agentic Skills", icon: Sparkles, adminOnly: true },
  { key: "connections", label: "Connections", icon: Puzzle, adminOnly: true },
];

const NAV_ITEM =
  "flex w-full min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[14px] font-normal transition-colors hover:bg-[var(--accent)] disabled:pointer-events-none disabled:opacity-40 sm:min-h-0 sm:py-2";
const NAV_ACTIVE = "bg-[#eef6fc] text-[#38A1E5] dark:bg-[rgb(15_45_72_/_0.92)] dark:text-[#5ec4ff]";
const GROUP_LABEL = "px-1 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]";
const CHIP =
  "min-h-[40px] shrink-0 snap-start whitespace-nowrap rounded-[8px] px-3 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

export function ProfileSettingsDialog({
  open,
  onClose,
  username,
  email,
  tenantKey,
  isAdmin = false,
}: {
  open: boolean;
  onClose: () => void;
  username: string;
  email: string;
  tenantKey: string;
  isAdmin?: boolean;
}) {
  const [section, setSection] = useState<Section>("account");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const allowed = (item: NavItem) => !item.adminOnly || isAdmin;
  const all = [...PROFILE_NAV, ...WORKSPACE_NAV];
  const title = all.find((i) => i.key === section)?.label ?? "Account";

  const railGroup = (items: NavItem[]) => (
    <ul className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const ok = allowed(item);
        return (
          <li key={item.key}>
            <button
              type="button"
              disabled={!ok}
              title={ok ? undefined : "Workspace admins only"}
              aria-current={section === item.key ? "page" : undefined}
              onClick={() => setSection(item.key)}
              className={cn(NAV_ITEM, section === item.key ? NAV_ACTIVE : "text-[var(--foreground)]")}
            >
              <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
              <span className="truncate">{item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  const body = (() => {
    switch (section) {
      case "account": return <AccountSection username={username} email={email} tenantKey={tenantKey} />;
      case "preferences": return <PreferencesSection tenantKey={tenantKey} />;
      case "personalization": return <PersonalizationSection tenantKey={tenantKey} />;
      case "general": return <GeneralSection tenantKey={tenantKey} />;
      case "billing": return <BillingSection tenantKey={tenantKey} isAdmin={isAdmin} onClose={onClose} />;
      case "usage": return <UsageSection isAdmin={isAdmin} onClose={onClose} />;
      case "security": return <SecuritySection onClose={onClose} />;
      case "api": return <ApiSection tenantKey={tenantKey} />;
      case "skills": return <SkillsSection onNavigate={setSection} />;
      case "connections": return <ConnectionsSection />;
    }
  })();

  // Rendered on <body>: the mobile sidebar is a transformed element, which
  // would otherwise become the containing block for this fixed overlay.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" />

      <div className="relative flex h-[min(88dvh,720px)] w-[min(calc(100vw-2rem),1040px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-md">
        <h2 id="settings-title" className="sr-only">Profile Settings</h2>
        <p className="sr-only">Manage your account and workspace settings</p>

        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col sm:flex-row">
          <aside className="hidden min-h-0 flex-col overflow-y-auto border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] sm:flex sm:h-full sm:w-[240px] sm:shrink-0 sm:border-r sm:px-4 sm:py-5 lg:w-[260px]">
            <div className="space-y-5">
              <div className="space-y-1">
                <p className={GROUP_LABEL}>Profile settings</p>
                {railGroup(PROFILE_NAV)}
              </div>
              <div className="space-y-1">
                <p className={GROUP_LABEL}>Workspace settings</p>
                {railGroup(WORKSPACE_NAV)}
              </div>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4">
              <h2 className="min-w-0 flex-1 text-base font-semibold tracking-tight text-[var(--sidebar-foreground)] dark:text-[var(--foreground)] sm:text-lg md:text-xl">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close settings"
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:size-8"
              >
                <X className="size-4" strokeWidth={1.75} aria-hidden />
              </button>
            </header>

            <nav className="shrink-0 border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] sm:hidden" aria-label="Settings sections">
              <div className="flex gap-1 overflow-x-auto overscroll-x-contain px-4 py-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {all.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    disabled={!allowed(item)}
                    aria-current={section === item.key ? "page" : undefined}
                    onClick={() => setSection(item.key)}
                    className={cn(
                      CHIP,
                      section === item.key
                        ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                        : "text-[var(--muted-foreground)] hover:bg-[color-mix(in_oklab,var(--muted)_60%,transparent)] hover:text-[var(--foreground)]",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-7">
              {body}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
