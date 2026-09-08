"use client";

// Workspace settings for admins, on the SDK's own tabs where the platform has
// them: General (organization), Plan & Billing, Security (sign-in and
// advanced), Connections (LLMs, data sources, APIs). Agentic Skills attach to
// an AI agent, so that section lists the workspace's agents first.

import { useEffect, useState } from "react";
import { OrganizationTab } from "@iblai/iblai-js/web-containers/next";
import { AdvancedTab, AgentSkills, BillingTab, IntegrationsTab } from "@iblai/iblai-js/web-containers";

import { PaymentsSettings } from "@/components/twin/payments-settings";
import config from "@/lib/iblai/config";
import { readTenants, type TenantEntry } from "@/lib/iblai/tenant";
import { HINT, OUTLINE_BTN } from "./ui";

const tenantEntry = (key: string): TenantEntry | undefined => readTenants().find((t) => t.key === key);

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="[&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm">{children}</div>
);

export function GeneralSection({ tenantKey }: { tenantKey: string }) {
  const [tenant, setTenant] = useState<TenantEntry | undefined>(() => tenantEntry(tenantKey));
  return (
    <div className="w-full space-y-4">
      <p className={HINT}>Workspace name, logo and support details.</p>
      <Frame>
        <OrganizationTab
          platformKey={tenantKey}
          tenant={tenant as never}
          setOrganizationLogoFromOutside={() => {}}
          onTenantUpdate={(t: unknown) => setTenant(t as TenantEntry)}
        />
      </Frame>
    </div>
  );
}

export function BillingSection({ tenantKey, username, email }: { tenantKey: string; username: string; email: string }) {
  return (
    <div className="w-full space-y-8">
      <p className={HINT}>The workspace&apos;s ibl.ai plan and credits, and the plan members pay for.</p>
      <Frame>
        <BillingTab
          tenant={tenantKey}
          username={username}
          mainPlatformKey={config.mainTenantKey()}
          currentUserEmail={email}
          redirectUrl={typeof window === "undefined" ? "" : window.location.origin}
        />
      </Frame>
      <PaymentsSettings tenantKey={tenantKey} />
    </div>
  );
}

export function SecuritySection({ tenantKey, username }: { tenantKey: string; username: string }) {
  return (
    <div className="w-full space-y-4">
      <p className={HINT}>Who can sign in, and how.</p>
      <Frame>
        <AdvancedTab
          platformKey={tenantKey}
          username={username}
          currentSPA="agent"
          authURL={config.authUrl()}
          currentPlatformBaseDomain={config.platformBaseDomain()}
        />
      </Frame>
    </div>
  );
}

export function ConnectionsSection({ tenantKey, username }: { tenantKey: string; username: string }) {
  return (
    <div className="w-full space-y-4">
      <p className={HINT}>Keys for the services this workspace uses: language models, data sources and APIs such as HeyGen.</p>
      <Frame>
        <IntegrationsTab tenantKey={tenantKey} username={username} />
      </Frame>
    </div>
  );
}

type Mentor = { unique_id?: string; id?: number | string; name?: string; slug?: string };

export function SkillsSection({ tenantKey, username }: { tenantKey: string; username: string }) {
  const [mentors, setMentors] = useState<Mentor[] | null>(null);
  const [picked, setPicked] = useState<Mentor | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("dm_token") ?? "";
    fetch(`${config.dmUrl()}/api/ai-mentor/orgs/${tenantKey}/users/${encodeURIComponent(username)}/mentors/?limit=50`, {
      headers: { Authorization: `Token ${token}` },
      cache: "no-store",
    })
      .then(async (r) => (r.ok ? ((await r.json()) as { results?: Mentor[] } | Mentor[]) : []))
      .then((d) => {
        const list = Array.isArray(d) ? d : d.results ?? [];
        setMentors(list);
        if (list[0]) setPicked(list[0]);
      })
      .catch(() => setMentors([]));
  }, [tenantKey, username]);

  return (
    <div className="w-full space-y-4">
      <p className={HINT}>Skills give an AI agent abilities: tools it can call and tasks it can run.</p>
      {mentors === null ? (
        <p className={HINT}>Loading agents…</p>
      ) : mentors.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--content-title)]">This workspace has no AI agents yet, so there is nothing to attach skills to.</p>
          <p className={`${HINT} mt-1`}>Agents are created in the ibl.ai console. Once one exists, its skills are managed here.</p>
          <a href={config.authUrl().replace("login.", "os.")} target="_blank" rel="noopener noreferrer" className={`${OUTLINE_BTN} mt-3`}>
            Open console
          </a>
        </div>
      ) : (
        <>
          {mentors.length > 1 && (
            <select
              aria-label="Agent"
              className="h-10 rounded-[8px] border border-[var(--input)] bg-[var(--background)] px-3 text-sm"
              value={String(picked?.unique_id ?? "")}
              onChange={(e) => setPicked(mentors.find((m) => String(m.unique_id) === e.target.value) ?? null)}
            >
              {mentors.map((m) => (
                <option key={String(m.unique_id)} value={String(m.unique_id)}>
                  {m.name ?? m.slug ?? m.unique_id}
                </option>
              ))}
            </select>
          )}
          {picked && (
            <Frame>
              <AgentSkills
                {...({ platformKey: tenantKey, mentorUniqueId: String(picked.unique_id ?? ""), mentorDbId: picked.id } as unknown as React.ComponentProps<typeof AgentSkills>)}
              />
            </Frame>
          )}
        </>
      )}
    </div>
  );
}
