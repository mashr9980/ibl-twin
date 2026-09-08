"use client";

// API: the workspace's Platform API Tokens — list and create. The platform
// has no revoke call, so that stays in the ibl.ai console.

import { useCallback, useEffect, useState } from "react";
import { Copy } from "lucide-react";

import { Alert } from "@/components/twin/alert";
import config from "@/lib/iblai/config";
import { FIELD, HINT, LABEL, OUTLINE_BTN, PRIMARY_BTN } from "./ui";

type Token = { name: string; username: string; created: string; expires: string | null; mode?: string };

const auth = () => ({ Authorization: `Token ${localStorage.getItem("dm_token") ?? ""}` });

export function ApiSection({ tenantKey }: { tenantKey: string }) {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [minted, setMinted] = useState<{ name: string; key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const base = `${config.dmUrl()}/api/core/platform/api-tokens/`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${base}?platform_key=${encodeURIComponent(tenantKey)}`, { headers: auth(), cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setTokens((await res.json()) as Token[]);
    } catch {
      setTokens([]);
      setError("Couldn't load the workspace's API tokens.");
    }
  }, [base, tenantKey]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "");
    if (!slug) return setError("Give the token a name, like production-server.");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { ...auth(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: slug, platform_key: tenantKey }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { key?: string; name?: string };
      setMinted({ name: data.name ?? slug, key: data.key ?? "" });
      setName("");
      await load();
    } catch {
      setError("Couldn't create the token. The name may already be taken.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      <div>
        <p className={HINT}>
          Platform API tokens let servers and scripts call the ibl.ai API for this workspace. Send one as{" "}
          <code className="rounded bg-[var(--muted)] px-1 py-0.5 text-[12px]">Authorization: Api-Token &lt;key&gt;</code>.
        </p>
      </div>
      {error && <Alert tone="warning" onDismiss={() => setError(null)}>{error}</Alert>}

      {minted && (
        <Alert onDismiss={() => setMinted(null)}>
          <span className="block">Token <strong>{minted.name}</strong> created. Copy it now; it is shown only once.</span>
          <span className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-white/60 px-2 py-1 font-mono text-[12px] text-[var(--content-title)]">{minted.key}</code>
            <button
              type="button"
              aria-label="Copy token"
              onClick={() => {
                void navigator.clipboard.writeText(minted.key).then(() => setCopied(true));
              }}
              className="inline-flex size-7 items-center justify-center rounded border border-current/30"
            >
              <Copy className="size-3.5" strokeWidth={1.75} />
            </button>
            {copied && <span className="text-xs">Copied</span>}
          </span>
        </Alert>
      )}

      <section className="space-y-3">
        <label className={LABEL} htmlFor="api-token-name">New token</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="api-token-name" className={FIELD} placeholder="production-server" value={name} onChange={(e) => setName(e.target.value)} />
          <button type="button" onClick={create} disabled={busy || !name.trim()} className={PRIMARY_BTN}>
            {busy ? "Creating…" : "Create token"}
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <span className={LABEL}>Existing tokens</span>
        {tokens === null ? (
          <p className={HINT}>Loading…</p>
        ) : tokens.length === 0 ? (
          <p className={HINT}>No tokens yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {tokens.map((t) => (
              <li key={`${t.username}-${t.name}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="font-medium text-[var(--content-title)]">{t.name}</span>
                <span className="text-xs text-[var(--muted-foreground)]">
                  by {t.username} · {new Date(t.created).toLocaleDateString()}
                  {t.expires ? ` · expires ${new Date(t.expires).toLocaleDateString()}` : " · no expiry"}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className={HINT}>
          Tokens are revoked from the ibl.ai console.{" "}
          <a href={`${config.authUrl().replace("login.", "os.")}`} target="_blank" rel="noopener noreferrer" className={`${OUTLINE_BTN} ml-1 h-7 px-2 text-xs`}>
            Open console
          </a>
        </p>
      </section>
    </div>
  );
}
