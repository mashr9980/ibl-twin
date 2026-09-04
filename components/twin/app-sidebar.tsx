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
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AudioLines, ChevronDown } from "lucide-react";

import {
  AvatarIcon,
  CollapseIcon,
  EducationalIcon,
  HistoricalIcon,
  MyAvatarIcon,
  MyTwinIcon,
  MyVideoClipIcon,
  TwinIcon,
  VideoClipIcon,
} from "@/components/twin/nav-icons";

import { HISTORICAL_SUBCATEGORIES, SUBCATEGORIES } from "@/lib/twin/categories";
import { cn } from "@/lib/utils";

type Item = {
  label: string;
  href: string;
  size?: string;
  children?: { label: string; href: string }[];
  icon: (props: { className?: string }) => React.ReactElement;
  /** Query key/value that must match for the item to read as active. */
  match?: { key: string; value: string };
};

type Group = { label: string; items: Item[] };

export const SIDEBAR_GROUPS: Group[] = [
  {
    label: "Create",
    items: [
      { label: "Twin", href: "/ai-avatar/generate", icon: TwinIcon, size: "size-[18px]" },
      { label: "Avatar", href: "/ai-avatar/select", icon: AvatarIcon, size: "size-5" },
      { label: "Video Clip", href: "/videos/generate", icon: VideoClipIcon, size: "size-5" },
    ],
  },
  {
    label: "My Videos",
    items: [
      { label: "Twin", href: "/videos/my?type=twin", icon: MyTwinIcon, match: { key: "type", value: "twin" } },
      { label: "Avatar", href: "/videos/my?type=avatar", icon: MyAvatarIcon, match: { key: "type", value: "avatar" } },
      { label: "Video Clip", href: "/videos/my?type=clip", icon: MyVideoClipIcon, match: { key: "type", value: "clip" } },
    ],
  },
  {
    label: "Gallery",
    items: [
      {
        label: "Educational",
        href: "/ai-avatar/my?category=MODERN",
        icon: EducationalIcon,
        match: { key: "category", value: "MODERN" },
        // Twin's own nine, verbatim. Each resolves to real avatars via the
        // classifier in lib/twin/categories.
        children: SUBCATEGORIES.map((name) => ({
          label: name,
          href: `/ai-avatar/my?category=MODERN&subcategory=${encodeURIComponent(name)}`,
        })),
      },
      {
        label: "Historical",
        href: "/ai-avatar/my?category=HISTORY",
        icon: HistoricalIcon,
        match: { key: "category", value: "HISTORY" },
        children: HISTORICAL_SUBCATEGORIES.map((name) => ({
          label: name,
          href: `/ai-avatar/my?category=HISTORY&subcategory=${encodeURIComponent(name)}`,
        })),
      },
    ],
  },
  {
    label: "Voice",
    items: [{ label: "Voice", href: "/scripts", icon: ({ className }) => <AudioLines className={className} strokeWidth={1.5} aria-hidden /> }],
  },
];

export function TwinLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <span
      className={cn("logo-section logo-section--custom", !collapsed && "logo-section--sidebar")}
      style={
        {
          "--logo-img-h-custom": "43.333333333333336px",
          "--logo-img-margin-top-custom": "0px",
          "--logo-img-margin-bottom-custom": "1.3333333333333333px",
        } as React.CSSProperties
      }
    >
      <span className="logo-section__row">
        <img className="logo-section__img" alt="memorare twin" src="/images/memorare-twin-logo.png" />
        {!collapsed && (
          <span className="logo-section__text">
            <span className="logo-section__line logo-section__line--top">memorare</span>
            <span className="logo-section__line-wrap logo-section__line-wrap--bottom">
              <span className="logo-section__line logo-section__line--bottom">twin</span>
            </span>
          </span>
        )}
      </span>
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
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = (label: string) => setExpanded((cur) => (cur === label ? null : label));

  const isActive = (item: Item) => {
    const [path] = item.href.split("?");
    if (pathname !== path) return false;
    if (!item.match) return true;
    return params.get(item.match.key) === item.match.value;
  };

  return (
    <nav className="space-y-1" aria-label="Main">
      {SIDEBAR_GROUPS.map((group, gi) => (
        <div key={group.label} className="space-y-1">
          {gi > 0 && <div role="separator" aria-hidden="true" className="my-3 h-px w-full shrink-0 bg-[var(--sidebar-border)]" />}
          {!collapsed && (
            <p className="px-2 pb-0 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {group.label}
            </p>
          )}
          <div className="space-y-1.5">
          {group.items.map((item) => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <div key={item.label + item.href} className="flex flex-col gap-0.5">
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                aria-expanded={item.children ? expanded === item.label : undefined}
                title={collapsed ? item.label : undefined}
                onClickCapture={() => item.children && setExpanded(item.label)}
                className={cn(
                  "flex h-9 w-full min-w-0 items-center gap-2 rounded-[5px] px-2 text-left text-[14px] font-normal transition-colors",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-[#eef6fc] text-[#38A1E5] dark:bg-[rgb(15_45_72_/_0.92)] dark:text-[#5ec4ff]"
                    : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)]",
                )}
              >
                <Icon className={cn("shrink-0", item.size ?? "size-4")} />
                {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>}
                {!collapsed && item.children && (
                  <ChevronDown
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(item.label); }}
                    className={cn(
                      "size-4 shrink-0 text-[#9ca3af] transition-transform duration-200",
                      expanded === item.label && "rotate-180",
                    )}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                )}
              </Link>
                {!collapsed && item.children && expanded === item.label && (
                  <div className="relative ml-[14px] flex flex-col gap-0.5 border-l-2 border-[#c7dff7] pl-3 dark:border-[rgb(56_161_229_/_0.45)]">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        title={child.label}
                        className="flex h-9 w-full min-w-0 items-center rounded-[5px] border-0 bg-transparent px-2 text-left text-[13px] font-normal text-[var(--sidebar-foreground)] no-underline transition-colors hover:bg-[var(--sidebar-accent)]"
                      >
                        <span className="truncate">{child.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          </div>
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
      className="hidden shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] px-[10px] transition-[width] duration-200 md:flex"
    >
      <div
        className={cn(
          "mb-0 flex h-[70px] w-full shrink-0 items-center gap-2 px-1",
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
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-[5px] text-[var(--sidebar-foreground)] transition-colors hover:bg-[var(--sidebar-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        >
          <CollapseIcon className="shrink-0 transition-transform" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-0 pb-2 pt-1">
        <SidebarNav collapsed={collapsed} />
      </div>

      {profile && (
        <div className="mt-auto w-full shrink-0 border-t border-[var(--sidebar-border)] px-0 py-2">
          {profile}
        </div>
      )}
    </aside>
  );
}
