"use client";

import { useState } from "react";

import config from "@/lib/iblai/config";
import type { NoticeCode } from "@/lib/iblai/access";
import { tenantSignupUrl } from "@/lib/iblai/signup";

type Props = {
  code: NoticeCode;
  email: string;
  inviteOnly: boolean;
};

const COPY: Record<NoticeCode, { title: string; body: string }> = {
  other_workspace: {
    title: "Your account belongs to a different workspace",
    body: "This email is already registered with another ibl.ai workspace, and this app only opens the memorare twin workspace. We stopped rather than sign you into the wrong one.",
  },
  no_access: {
    title: "You are not a member of this workspace yet",
    body: "We signed you in with ibl.ai, but this workspace has not added your email address, so there is nothing here for you to open yet.",
  },
  session_expired: {
    title: "Your session expired",
    body: "Sign in again to pick up where you left off.",
  },
  error: {
    title: "We could not finish signing you in",
    body: "Something went wrong on the way back from ibl.ai. Try again, and let us know if it keeps happening.",
  },
};

export function AuthNotice({ code, email, inviteOnly }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "invited" | "failed">("idle");
  const copy = COPY[code];
  const needsAccess = code === "no_access" || code === "other_workspace";
  const canRequest = needsAccess && !!email;

  // With self-linking on, anyone can enrol themselves and the join page is the
  // shortest way in. With it off, the request below is the only route.
  const signupHref = needsAccess && !inviteOnly ? tenantSignupUrl() : "";

  async function requestAccess() {
    setState("sending");
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          tenant: config.mainTenantKey(),
          reason: code === "other_workspace" ? "registered_on_another_workspace" : "not_a_member",
        }),
      });
      if (!res.ok) {
        setState("failed");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setState(data?.invited ? "invited" : "sent");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="auth-notice" role="alert">
      <p className="auth-notice__title">{copy.title}</p>
      <p className="auth-notice__body">
        {copy.body}
        {(code === "no_access" || code === "other_workspace") && inviteOnly
          ? " This workspace is invite only, so you cannot add yourself."
          : ""}
      </p>
      {email && (
        <p className="auth-notice__body">
          You signed in as <strong>{email}</strong>. If you have an invite on a
          different address, use that one below.
        </p>
      )}

      {signupHref && state === "idle" && (
        <a className="auth-notice__action auth-notice__action--primary" href={signupHref}>
          Create your account
        </a>
      )}

      {canRequest && state !== "sent" && state !== "invited" && (
        <button
          type="button"
          className="auth-notice__action"
          onClick={requestAccess}
          disabled={state === "sending"}
        >
          {state === "sending" ? "Sending..." : "Ask the owner for access"}
        </button>
      )}
      {state === "invited" && (
        <p className="auth-notice__ok">
          Invite sent. Check {email} for the invitation, accept it, then sign in
          again here.
        </p>
      )}
      {state === "sent" && (
        <p className="auth-notice__ok">
          Request sent. The workspace owner will see it and can invite you.
        </p>
      )}
      {state === "failed" && (
        <p className="auth-notice__body">
          We could not send that request. Email the workspace owner directly.
        </p>
      )}
    </div>
  );
}
