"use client";

// Connections, laid out as twin.memorare.ai's: the places a video can come
// from or go to. Only the ones this workspace can actually reach are offered.

import { useState } from "react";
import { Alert } from "@/components/twin/alert";
import { CARD } from "./ui";
import { PRIMARY_BTN } from "./ui";

// lucide-react no longer ships brand marks, so these are drawn here.
const ICON = "size-5 shrink-0 text-[var(--foreground)]";

const SlackIcon = () => (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="3" height="8" x="13" y="2" rx="1.5" />
    <path d="M19 8.5V10h1.5A1.5 1.5 0 1 0 19 8.5" />
    <rect width="3" height="8" x="8" y="14" rx="1.5" />
    <path d="M5 15.5V14H3.5A1.5 1.5 0 1 0 5 15.5" />
    <rect width="8" height="3" x="14" y="13" rx="1.5" />
    <path d="M15.5 19H14v1.5a1.5 1.5 0 1 0 1.5-1.5" />
    <rect width="8" height="3" x="2" y="8" rx="1.5" />
    <path d="M8.5 5H10V3.5A1.5 1.5 0 1 0 8.5 5" />
  </svg>
);

const YoutubeIcon = () => (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </svg>
);

const LinkedinIcon = () => (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

type Connection = {
  key: string;
  name: string;
  icon: () => React.ReactElement;
  blurb: string;
  state: "connect" | "soon";
};

const CONNECTIONS: Connection[] = [
  {
    key: "slack",
    name: "Slack",
    icon: SlackIcon,
    blurb: "Connect your Slack account to Memorare Twin and make videos from the comfort and familiarity of your Slack workspace.",
    state: "connect",
  },
  {
    key: "youtube",
    name: "YouTube",
    icon: YoutubeIcon,
    blurb: "Connect YouTube to publish your videos directly from Memorare Twin with one click.",
    state: "connect",
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    icon: LinkedinIcon,
    blurb: "Connect your LinkedIn account to enable Verified Skills integration with Memorare Twin.",
    state: "soon",
  },
];

export function ConnectionsSection() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="w-full pb-4">
      {notice && (
        <Alert tone="warning" className="mb-4" onDismiss={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {CONNECTIONS.map(({ key, name, icon: Icon, blurb, state }) => (
          <article key={key} className={`${CARD} flex flex-col`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{name}</h3>
              </div>
              {state === "connect" ? (
                <button
                  type="button"
                  onClick={() => setNotice(`${name} isn't connected on this workspace yet. Ask the workspace owner to set it up in ibl.ai.`)}
                  className={PRIMARY_BTN}
                >
                  Connect
                </button>
              ) : (
                <span className="inline-flex h-9 shrink-0 cursor-not-allowed items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-normal leading-none text-[var(--muted-foreground)] shadow-none">
                  Coming soon
                </span>
              )}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted-foreground)]">{blurb}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
