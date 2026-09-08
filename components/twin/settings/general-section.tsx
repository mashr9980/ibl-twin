"use client";

// General: the workspace's picture, name and description, saved through the
// SDK's platform and tenant-metadata endpoints.

import { useEffect, useRef, useState } from "react";
import { Building2 } from "lucide-react";
import {
  useGetTenantMetadataQuery,
  useUpdatePlatformInfoMutation,
  useUpdateTenantMetadataMutation,
  useUploadLightLogoMutation,
} from "@iblai/iblai-js/data-layer";

import { Alert } from "@/components/twin/alert";
import config from "@/lib/iblai/config";
import { readTenants } from "@/lib/iblai/tenant";
import { cn } from "@/lib/utils";
import { FIELD, HINT, LABEL, OUTLINE_BTN, TEXTAREA } from "./ui";

const LOGO_MAX = 4 * 1024 * 1024;

type Metadata = Record<string, unknown> & { description?: string };

export function GeneralSection({ tenantKey }: { tenantKey: string }) {
  const metaQuery = useGetTenantMetadataQuery({ org: tenantKey } as never, { skip: !tenantKey });
  const [updateMetadata, savingMeta] = useUpdateTenantMetadataMutation();
  const [updatePlatformInfo, savingName] = useUpdatePlatformInfoMutation();
  const [uploadLogo, uploading] = useUploadLightLogoMutation();

  const metadata = ((metaQuery.data as { metadata?: Metadata } | undefined)?.metadata ?? {}) as Metadata;
  // The platform stores the workspace's name as `platform_name`, and leaves it
  // equal to the key until someone names it.
  const stored = readTenants().find((t) => t.key === tenantKey);
  const rawName = typeof stored?.platform_name === "string" ? stored.platform_name : "";
  const storedName = /^[a-z0-9]{32}$/i.test(rawName) ? "" : rawName;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  // The gateway serves the workspace logo from the DM base, and only with the
  // trailing slash; `/axd/…` is refused outright.
  const logoUrl = `${config.dmUrl()}/api/core/orgs/${tenantKey}/logo/`;
  const [logo, setLogo] = useState<string | null>(logoUrl);
  const [notice, setNotice] = useState<{ tone: "info" | "warning"; text: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(storedName);
  }, [storedName]);
  useEffect(() => {
    if (typeof metadata.description === "string") setDescription(metadata.description);
  }, [metadata.description]);

  async function onLogo(picked: File) {
    setNotice(null);
    if (!picked.type.startsWith("image/")) return setNotice({ tone: "warning", text: "Please choose an image file." });
    if (picked.size > LOGO_MAX) return setNotice({ tone: "warning", text: "That image is over 4MB. Please pick a smaller one." });
    const form = new FormData();
    form.append("file", picked, picked.name);
    try {
      await uploadLogo({ org: tenantKey, formData: form } as never).unwrap();
      setLogo(`${logoUrl}?v=${Date.now()}`);
      setNotice({ tone: "info", text: "Workspace picture updated." });
    } catch {
      setNotice({ tone: "warning", text: "Couldn't upload that image. Please try again." });
    }
  }

  async function saveName() {
    if (!name.trim() || name.trim() === storedName) return;
    try {
      await updatePlatformInfo({ requestBody: { name: name.trim(), key: tenantKey } } as never).unwrap();
      // Keep the stored tenant list in step so the field survives a reload.
      const tenants = readTenants().map((t) => (t.key === tenantKey ? { ...t, platform_name: name.trim() } : t));
      localStorage.setItem("tenants", JSON.stringify(tenants));
      setNotice({ tone: "info", text: "Workspace name saved." });
    } catch {
      setNotice({ tone: "warning", text: "Couldn't save the workspace name. Please try again." });
    }
  }

  async function saveDescription() {
    if (description === (metadata.description ?? "")) return;
    try {
      await updateMetadata([{ org: tenantKey, requestBody: { metadata: { ...metadata, description } } }] as never).unwrap();
      setNotice({ tone: "info", text: "Workspace description saved." });
    } catch {
      setNotice({ tone: "warning", text: "Couldn't save the description. Please try again." });
    }
  }

  return (
    <div className="w-full">
      <div className="space-y-8">
        {notice && (
          <Alert tone={notice.tone} onDismiss={() => setNotice(null)}>
            {notice.text}
          </Alert>
        )}

        <section className="space-y-3">
          <span className={LABEL}>Profile Picture</span>
          <div className="flex items-center gap-4 sm:gap-5">
            <span className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border)] bg-[var(--card)]">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="aspect-square h-full w-full object-cover" alt={name || "Workspace"} src={logo} onError={() => setLogo(null)} />
              ) : (
                <Building2 className="size-7 text-[var(--muted-foreground)]" strokeWidth={1.5} aria-hidden />
              )}
            </span>
            <div className="min-w-0 space-y-1.5">
              <input
                ref={file}
                accept="image/*"
                className="sr-only"
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onLogo(f);
                  e.target.value = "";
                }}
              />
              <button type="button" onClick={() => file.current?.click()} disabled={uploading.isLoading} className={OUTLINE_BTN}>
                {uploading.isLoading ? "Uploading…" : "Upload photo"}
              </button>
              <p className={HINT}>Pick a photo up to 4MB.</p>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <label className={LABEL} htmlFor="workspace-name">Workspace Name</label>
          <input
            id="workspace-name"
            className={cn(FIELD, "sm:max-w-md")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            disabled={savingName.isLoading}
          />
        </section>

        <section className="space-y-3">
          <label className={LABEL} htmlFor="workspace-description">Workspace Description</label>
          <textarea
            id="workspace-description"
            className={cn(TEXTAREA, "sm:max-w-md")}
            placeholder="Write some words to describe your team"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            disabled={savingMeta.isLoading || metaQuery.isLoading}
          />
        </section>
      </div>
    </div>
  );
}
