"use client";

/**
 * Invite a user to the tenant.
 *
 * vibe's Account component doesn't own this flow — it raises `onInviteClick`
 * and expects the host app to handle it. Both the starter and iblai/video pass
 * `() => {}`, so the Invite button renders enabled and does nothing at all: no
 * dialog, no error, no clue. This supplies the missing half.
 *
 * Invitees land as ordinary members; roles are assigned afterwards from the
 * Users table, which mirrors how os.ibl.ai behaves.
 */

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import config from "@/lib/iblai/config";
import { resolveAppTenant } from "@/lib/iblai/tenant";

type State = { kind: "idle" | "sending" | "sent" | "error"; message?: string };

export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setState({ kind: "idle" });
    const t = setTimeout(() => input.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(address)) {
      setState({ kind: "error", message: "Enter a valid email address." });
      return;
    }
    setState({ kind: "sending" });

    const token = localStorage.getItem("dm_token") ?? "";
    const tenant = resolveAppTenant();
    try {
      const res = await fetch(`${config.dmUrl()}/api/catalog/invitations/platform/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: address,
          platform_key: tenant,
          redirect_to: window.location.origin,
          active: true,
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`${res.status} ${body.slice(0, 140)}`);
      }
      setState({ kind: "sent", message: `Invitation sent to ${address}.` });
      setEmail("");
    } catch (err) {
      setState({
        kind: "error",
        message:
          err instanceof Error && /already|exists|duplicate/i.test(err.message)
            ? "That address has already been invited."
            : "Couldn't send the invitation. Please try again.",
      });
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0" />
      <div className="relative w-full max-w-[440px] rounded-[var(--radius-pill)] bg-[var(--card)] p-5 shadow-[var(--shadow-popover)]">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 id="invite-title" className="text-[16px] font-semibold text-[var(--content-title)]">Invite Users</h2>
            <p className="mt-0.5 text-[13px] text-[var(--content-caption)]">
              They&apos;ll join as a member. You can change their role afterwards from the Users table.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[var(--radius-control)] text-[var(--content-caption)] hover:bg-[var(--canvas-muted)]">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={send}>
          <label htmlFor="invite-email" className="mb-1.5 block text-[13px] font-medium text-[var(--content-title)]">Email</label>
          <input
            ref={input}
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (state.kind !== "idle") setState({ kind: "idle" }); }}
            placeholder="name@example.com"
            aria-invalid={state.kind === "error"}
            className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--card)] px-3 text-[13.5px] text-[var(--content-title)] outline-none placeholder:text-[var(--content-caption)] focus:border-[var(--brand)]"
          />

          {state.message && (
            <p role={state.kind === "error" ? "alert" : "status"}
              className={`mt-2 text-[13px] ${state.kind === "error" ? "text-red-600" : "text-green-700"}`}>
              {state.message}
            </p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="h-10 rounded-[var(--radius-control)] border border-[var(--border)] px-4 text-[13px] text-[var(--content-title)] hover:bg-[var(--canvas-muted)]">
              Cancel
            </button>
            <button type="submit" disabled={state.kind === "sending" || !email.trim()} className="twin-gradient h-10 px-4 text-[13px] font-semibold">
              {state.kind === "sending" ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
