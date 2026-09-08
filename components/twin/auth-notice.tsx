"use client";

import type { NoticeCode } from "@/lib/iblai/access";
import { CAPTION, PRIMARY_BUTTON } from "@/components/twin/auto-checkout";

const COPY: Record<NoticeCode, string> = {
  session_expired: "Your session expired. Sign in again to pick up where you left off.",
  error: "We could not finish signing you in. Try again, and let us know if it keeps happening.",
  // Membership refusals go to the paywall, never here.
  no_access: "You are not a member of this workspace yet.",
  other_workspace: "Your account is not a member here yet.",
};

export function AuthNotice({ code, onSignIn }: { code: NoticeCode; onSignIn: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className={CAPTION} role="alert">
        {COPY[code]}
      </p>
      <button type="button" className={PRIMARY_BUTTON} onClick={onSignIn}>
        Sign in
      </button>
    </div>
  );
}
