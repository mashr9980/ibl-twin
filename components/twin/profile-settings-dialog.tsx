"use client";

/**
 * Twin's "Profile settings" dialog: profile settings for every member, and
 * workspace settings for admins, each section live against the platform.
 */

import { useEffect, useState } from "react";
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
import {
  BillingSection, ConnectionsSection, GeneralSection, SecuritySection, SkillsSection,
} from "@/components/twin/settings/workspace-sections";
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

  if (!open) return null;

  const allowed = (item: NavItem) => !item.adminOnly || isAdmin;

  const nav = (items: NavItem[]) => (
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
      case "billing": return <BillingSection tenantKey={tenantKey} username={username} email={email} />;
      case "usage": return <UsageSection isAdmin={isAdmin} onClose={onClose} />;
      case "security": return <SecuritySection tenantKey={tenantKey} username={username} />;
      case "api": return <ApiSection tenantKey={tenantKey} />;
      case "skills": return <SkillsSection tenantKey={tenantKey} username={username} />;
      case "connections": return <ConnectionsSection tenantKey={tenantKey} username={username} />;
    }
  })();

  const all = [...PROFILE_NAV, ...WORKSPACE_NAV];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Profile settings">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" />

      <div className="relative flex h-[min(88dvh,720px)] w-[min(calc(100vw-2rem),1040px)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-md">
        <div className="flex h-full min-h-0 flex-1 flex-col sm:flex-row">
          <aside className="hidden min-h-0 flex-col overflow-y-auto border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_40%,transparent)] sm:flex sm:h-full sm:w-[240px] sm:shrink-0 sm:border-r sm:px-4 sm:py-5 lg:w-[260px]">
            <div className="space-y-5">
              <div className="space-y-1">
                <p className={GROUP_LABEL}>Profile settings</p>
                {nav(PROFILE_NAV)}
              </div>
              <div className="space-y-1">
                <p className={GROUP_LABEL}>Workspace settings</p>
                {nav(WORKSPACE_NAV)}
              </div>
            </div>
          </aside>

          {/* Phones: the sections as a select above the content. */}
          <div className="border-b border-[var(--border)] px-4 pt-4 sm:hidden">
            <label htmlFor="settings-section" className="sr-only">Section</label>
            <select
              id="settings-section"
              value={section}
              onChange={(e) => setSection(e.target.value as Section)}
              className="mb-3 h-10 w-full rounded-[8px] border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
            >
              {all.filter(allowed).map((i) => (
                <option key={i.key} value={i.key}>{i.label}</option>
              ))}
            </select>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-7">
            {body}
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
