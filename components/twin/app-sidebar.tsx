"use client";

/**
 * Left rail, 255px expanded / 56px collapsed.
 *
 * Structure and icons mirror twin.memorare.ai (see docs teardown §4): four
 * groups, a logo row that doubles as the collapse control, and a profile row
 * pinned to the bottom. On mobile the rail is hidden and rendered as a drawer
 * by the layout instead.
 */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AudioLines,
  CirclePlay,
  Clapperboard,
  Crown,
  Film,
  GraduationCap,
  PanelLeft,
  SquarePlus,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Item = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Query key/value that must match for the item to read as active. */
  match?: { key: string; value: string };
};

type Group = { label: string; items: Item[] };

export const SIDEBAR_GROUPS: Group[] = [
  {
    label: "Create",
    items: [
      { label: "Twin", href: "/ai-avatar/generate", icon: SquarePlus },
      { label: "Avatar", href: "/ai-avatar/select", icon: Users },
      { label: "Video Clip", href: "/videos/generate", icon: Clapperboard },
    ],
  },
  {
    label: "My Videos",
    items: [
      { label: "Twin", href: "/videos/my?type=twin", icon: User, match: { key: "type", value: "twin" } },
      { label: "Avatar", href: "/videos/my?type=avatar", icon: Film, match: { key: "type", value: "avatar" } },
      { label: "Video Clip", href: "/videos/my?type=clip", icon: CirclePlay, match: { key: "type", value: "clip" } },
    ],
  },
  {
    label: "Gallery",
    items: [
      { label: "Educational", href: "/ai-avatar/my?category=MODERN", icon: GraduationCap, match: { key: "category", value: "MODERN" } },
      { label: "Historical", href: "/ai-avatar/my?category=HISTORY", icon: Crown, match: { key: "category", value: "HISTORY" } },
    ],
  },
  {
    label: "Voice",
    items: [{ label: "Voice", href: "/scripts", icon: AudioLines }],
  },
];

export function TwinLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="twin-gradient flex h-[30px] w-[29px] flex-none items-center justify-center rounded-[7px] text-[13px] font-bold"
      >
        M
      </span>
      {!collapsed && (
        <span className="flex flex-col leading-[1.05]">
          <span className="text-[15px] font-medium text-[var(--brand)]">memorare</span>
          <span className="twin-gradient-text text-[17px] font-bold">twin</span>
        </span>
      )}
    </span>
  );
}

export function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();

  const isActive = (item: Item) => {
    const [path] = item.href.split("?");
    if (pathname !== path) return false;
    if (!item.match) return true;
    return params.get(item.match.key) === item.match.value;
  };

  return (
    <nav className="flex flex-col gap-4" aria-label="Main">
      {SIDEBAR_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {!collapsed && (
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--content-caption)]">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.label + item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-[var(--radius-control)] px-2 text-[13.5px] transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-[var(--composer-chip)] font-medium text-[var(--brand)]"
                    : "text-[var(--content-title)] hover:bg-[var(--canvas-muted)]",
                )}
              >
                <Icon size={16} strokeWidth={1.75} className="flex-none" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppSidebar({
  collapsed,
  onToggle,
  profile,
}: {
  collapsed: boolean;
  onToggle: () => void;
  profile?: React.ReactNode;
}) {
  return (
    <aside
      style={{
        width: collapsed
          ? "var(--sidebar-width-collapsed)"
          : "var(--sidebar-width)",
      }}
      className="hidden shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] transition-[width] duration-200 md:flex"
    >
      <div
        className={cn(
          "flex h-[66px] flex-none items-center gap-2 px-3",
          collapsed && "justify-center px-0",
        )}
      >
        {!collapsed && (
          <Link href="/" className="min-w-0 flex-1">
            <TwinLogo />
          </Link>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-[var(--radius-control)] text-[var(--content-caption)] transition-colors hover:bg-[var(--canvas-muted)] hover:text-[var(--content-title)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          <PanelLeft size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <SidebarNav collapsed={collapsed} />
      </div>

      {profile && (
        <div className="flex-none border-t border-[var(--border)] p-2">
          {profile}
        </div>
      )}
    </aside>
  );
}
