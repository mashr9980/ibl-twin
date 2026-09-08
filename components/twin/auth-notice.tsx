"use client";

import type { NoticeCode } from "@/lib/iblai/access";

const COPY: Record<NoticeCode, { title: string; body: string }> = {
  session_expired: {
    title: "Your session expired",
    body: "Sign in again to pick up where you left off.",
  },
  error: {
    title: "We could not finish signing you in",
    body: "Something went wrong on the way back from ibl.ai. Try again, and let us know if it keeps happening.",
  },
  // Membership refusals go to the paywall, never here.
  no_access: { title: "You are not a member of this workspace yet", body: "" },
  other_workspace: { title: "Your account is not a member here yet", body: "" },
};

export function AuthNotice({ code, onSignIn }: { code: NoticeCode; onSignIn: () => void }) {
  const copy = COPY[code];
  return (
    <div className="auth-card">
      <div className="auth-card__stack">
        <div className="auth-notice" role="alert" style={{ margin: 0, boxShadow: "none" }}>
          <p className="auth-notice__title">{copy.title}</p>
          {copy.body && <p className="auth-notice__body">{copy.body}</p>}
        </div>
        <button type="button" className="btn btn--primary" onClick={onSignIn}>
          Sign in
        </button>
      </div>
    </div>
  );
}
