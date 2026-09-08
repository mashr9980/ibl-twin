"use client";

// Account: the member's platform profile through the SDK's data layer —
// picture, name, email, password reset link, account deletion.

import { useEffect, useRef, useState } from "react";
import {
  useGetUserMetadataEdxQuery,
  useSelfRetireMutation,
  useUpdateUserMetadataEdxMutation,
  useUploadProfileImageMutation,
} from "@iblai/iblai-js/data-layer";

import { Alert } from "@/components/twin/alert";
import { handleLogout } from "@/lib/iblai/auth-utils";
import config from "@/lib/iblai/config";
import { FIELD, HINT, LABEL, OUTLINE_BTN, PRIMARY_BTN } from "./ui";

const PHOTO_MAX = 4 * 1024 * 1024;

type EdxAccount = {
  name?: string;
  email?: string;
  year_of_birth?: number | null;
  profile_image?: { has_image?: boolean; image_url_full?: string; image_url_large?: string };
};

const splitName = (full: string) => {
  const [first = "", ...rest] = full.trim().split(/\s+/);
  return { first, last: rest.join(" ") };
};

export function AccountSection({ username, email, tenantKey }: { username: string; email: string; tenantKey: string }) {
  const account = useGetUserMetadataEdxQuery({ params: { username } } as never, { skip: !username });
  const data = account.data as EdxAccount | undefined;
  const [updateEdx, updating] = useUpdateUserMetadataEdxMutation();
  const [uploadImage, uploading] = useUploadProfileImageMutation();
  const [resetting, setResetting] = useState(false);
  const [selfRetire, retiring] = useSelfRetireMutation();

  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "warning"; text: string } | null>(null);
  const photo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data?.name) return;
    const { first: f, last: l } = splitName(data.name);
    setFirst(f);
    setLast(l);
  }, [data?.name]);

  const currentEmail = data?.email || email;
  // The platform names the picture on the API host, which does not serve media; the LMS host does.
  const picture = data?.profile_image?.has_image
    ? (data.profile_image.image_url_full || data.profile_image.image_url_large || "").replace(/^https?:\/\/[^/]+/, config.legacyLmsUrl())
    : null;
  const nameDirty = data ? `${first} ${last}`.trim() !== (data.name ?? "").trim() : false;

  const patch = (body: Record<string, unknown>) =>
    updateEdx({ username, body: JSON.stringify(body), method: "PATCH", contentType: "application/merge-patch+json" } as never).unwrap();

  async function onPhoto(file: File) {
    setNotice(null);
    if (!file.type.startsWith("image/")) return setNotice({ tone: "warning", text: "Please choose an image file." });
    if (file.size > PHOTO_MAX) return setNotice({ tone: "warning", text: "That photo is over 4MB. Please pick a smaller one." });
    try {
      // The platform needs a year of birth on the profile before it accepts a picture.
      if (!data?.year_of_birth) await patch({ year_of_birth: 1996 });
      await uploadImage({ file, filename: file.name, username } as never).unwrap();
      await account.refetch();
      setNotice({ tone: "info", text: "Profile photo updated." });
    } catch {
      setNotice({ tone: "warning", text: "Couldn't upload that photo. Please try again." });
    }
  }

  async function saveName() {
    setNotice(null);
    try {
      await patch({ name: `${first} ${last}`.trim() });
      setNotice({ tone: "info", text: "Name saved." });
    } catch {
      setNotice({ tone: "warning", text: "Couldn't save your name. Please try again." });
    }
  }

  async function changeEmail() {
    const next = emailDraft.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(next)) return setNotice({ tone: "warning", text: "Enter a valid email address." });
    setNotice(null);
    try {
      await patch({ email: next });
      setEmailOpen(false);
      setNotice({ tone: "info", text: `A confirmation link was sent to ${next}. Your email changes once you open it.` });
    } catch {
      setNotice({ tone: "warning", text: "Couldn't change your email. It may already be in use." });
    }
  }

  // The SDK's own call goes to the legacy LMS host with cookies, which the
  // browser refuses cross-origin; the same endpoint answers on the API host.
  async function sendReset() {
    setNotice(null);
    setResetting(true);
    try {
      const res = await fetch(`${config.lmsUrl()}/ibl/edx/account/api/reset-password-token`, {
        method: "POST",
        headers: { Authorization: `JWT ${localStorage.getItem("edx_jwt_token") ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentEmail, platform_key: tenantKey, redirect_to: window.location.origin, app: "custom" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setNotice({ tone: "info", text: `A link to set your password was sent to ${currentEmail}.` });
    } catch {
      setNotice({ tone: "warning", text: "Couldn't send the password link. Please try again." });
    } finally {
      setResetting(false);
    }
  }

  async function deleteAccount() {
    setNotice(null);
    try {
      await selfRetire().unwrap();
      handleLogout();
    } catch {
      setConfirmDelete(false);
      setNotice({ tone: "warning", text: "Couldn't delete your account. Please try again or contact support." });
    }
  }

  return (
    <div className="w-full space-y-8">
      {notice && (
        <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}

      <section className="space-y-3">
        <span className={LABEL}>Profile Picture</span>
        <div className="flex items-center gap-4 sm:gap-5">
          <span className="relative flex size-20 shrink-0 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={picture ?? "/images/user-profile.png"} alt={username} className="aspect-square h-full w-full object-cover" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <input
              ref={photo}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPhoto(f);
                e.target.value = "";
              }}
            />
            <button type="button" onClick={() => photo.current?.click()} disabled={uploading.isLoading || !username} className={OUTLINE_BTN}>
              {uploading.isLoading ? "Uploading…" : "Upload photo"}
            </button>
            <p className={HINT}>Pick a photo up to 4MB.</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <label className={LABEL} htmlFor="settings-first-name">First Name</label>
          <input id="settings-first-name" className={FIELD} value={first} onChange={(e) => setFirst(e.target.value)} disabled={!data} />
        </div>
        <div className="space-y-2">
          <label className={LABEL} htmlFor="settings-last-name">Last Name</label>
          <input id="settings-last-name" className={FIELD} value={last} onChange={(e) => setLast(e.target.value)} disabled={!data} />
        </div>
      </div>
      {nameDirty && (
        <button type="button" onClick={saveName} disabled={updating.isLoading || !first.trim()} className={PRIMARY_BTN}>
          {updating.isLoading ? "Saving…" : "Save name"}
        </button>
      )}

      <section className="space-y-3">
        <span className={LABEL}>Email</span>
        <p className="text-sm text-[var(--muted-foreground)]">{currentEmail}</p>
        {emailOpen ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              aria-label="New email"
              className={FIELD}
              placeholder="new@example.com"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
            />
            <button type="button" onClick={changeEmail} disabled={updating.isLoading} className={PRIMARY_BTN}>
              Send confirmation
            </button>
            <button type="button" onClick={() => setEmailOpen(false)} className={OUTLINE_BTN}>
              Cancel
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setEmailOpen(true)} className={OUTLINE_BTN}>
            Change email
          </button>
        )}
      </section>

      <section className="space-y-3">
        <span className={LABEL}>Password</span>
        <p className={HINT}>We email you a link to create or change your password.</p>
        <button type="button" onClick={sendReset} disabled={resetting} className={OUTLINE_BTN}>
          {resetting ? "Sending…" : "Send password link"}
        </button>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={LABEL}>2-factor authentication</span>
          <span className="text-sm text-[var(--muted-foreground)]">Off</span>
        </div>
        <p className={HINT}>Two-factor sign-in is not offered on this workspace yet.</p>
      </section>

      <div className="border-t border-[var(--border)] pt-8">
        <section className="space-y-3">
          <span className={LABEL}>Connected accounts</span>
          <p className={HINT}>Google and other sign-in methods are managed on the ibl.ai sign-in page.</p>
          <a href={config.authUrl()} target="_blank" rel="noopener noreferrer" className={OUTLINE_BTN}>
            Manage sign-in methods
          </a>
        </section>
      </div>

      <div className="border-t border-[var(--border)] pt-8">
        {confirmDelete ? (
          <div className="space-y-3 rounded-lg border border-[#f2b544]/70 bg-[#fff7e6] p-4 text-[#8a5a00]">
            <p className="text-sm">Delete your account? Your profile is scheduled for removal and you are signed out. This cannot be undone.</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={deleteAccount} disabled={retiring.isLoading} className={PRIMARY_BTN}>
                {retiring.isLoading ? "Deleting…" : "Yes, delete my account"}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className={OUTLINE_BTN}>
                Keep my account
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setConfirmDelete(true)} className={PRIMARY_BTN}>
              Delete Account
            </button>
            <button type="button" onClick={handleLogout} className={OUTLINE_BTN}>
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
