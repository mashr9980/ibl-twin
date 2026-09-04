"use client";

/**
 * Twin's notifications box.
 *
 * It isn't a page or a dialog: it replaces the profile popover's contents in
 * place, with a back arrow returning to the menu. Rebuilt from twin's markup;
 * the rows are real notifications from
 * `dm/api/notification/v1/orgs/{org}/users/{user}/notifications/`.
 */

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Bell, CheckCheck } from "lucide-react";

import config from "@/lib/iblai/config";
import { resolveAppTenant } from "@/lib/iblai/tenant";

type Notification = {
  id: string;
  title?: string | null;
  short_message?: string | null;
  status?: string | null;
  created_at?: string | null;
};

/** "2 minutes ago", the way twin phrases it. */
function ago(iso?: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function NotificationsPanel({ onBack, username }: { onBack: () => void; username: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const tenant = resolveAppTenant();
    const token = localStorage.getItem("dm_token") ?? "";
    if (!tenant || !username) return;
    try {
      const res = await fetch(
        `${config.dmUrl()}/api/notification/v1/orgs/${tenant}/users/${encodeURIComponent(username)}/notifications/?page_size=20`,
        { headers: { Authorization: `Token ${token}`, Accept: "application/json" } },
      );
      const body = await res.json();
      setItems(body?.results ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = items.filter((n) => (n.status ?? "").toUpperCase() === "UNREAD").length;

  return (
    <div className="flex max-h-[min(420px,calc(100dvh-8rem))] flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-2 py-2.5">
        <div className="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to profile menu"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[5px] text-[var(--sidebar-foreground)] transition-colors hover:bg-[var(--sidebar-accent)]"
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </button>
          <span className="truncate text-[14px] font-normal text-[var(--sidebar-foreground)]">Notifications</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {unread > 0 && <span className="text-[13px] font-medium text-[var(--brand)]">{unread} unread</span>}
          <button
            type="button"
            disabled={!unread}
            aria-label="Mark all as read"
            className="inline-flex size-8 items-center justify-center rounded-[5px] text-[var(--sidebar-foreground)] transition-colors hover:bg-[var(--sidebar-accent)] disabled:pointer-events-none disabled:opacity-40"
          >
            <CheckCheck size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2">
        <span className="shrink-0 text-[11px] font-medium text-[var(--muted-foreground)]">
          {unread > 0 ? "New" : "Earlier"}
        </span>
        <div className="h-px min-w-0 flex-1 bg-[var(--border)]" aria-hidden="true" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {loading ? (
          <p className="px-2.5 py-6 text-center text-[13px] text-[var(--muted-foreground)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-[13px] text-[var(--muted-foreground)]">No notifications yet.</p>
        ) : (
          <ul className="flex flex-col">
            {items.map((n) => {
              const isUnread = (n.status ?? "").toUpperCase() === "UNREAD";
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    className="flex w-full gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--accent)]"
                  >
                    <Bell size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--muted-foreground)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold leading-snug text-[var(--sidebar-foreground)]">
                        {n.title || "Notification"}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                      <span className="whitespace-nowrap text-[11px] text-[var(--muted-foreground)]">{ago(n.created_at)}</span>
                      {isUnread ? (
                        <span className="size-2 shrink-0 rounded-full bg-[var(--brand)]" aria-label="Unread" />
                      ) : (
                        <span className="size-2 shrink-0" aria-hidden="true" />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
