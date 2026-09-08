"use client";

// Agentic Skills, laid out as twin.memorare.ai's: the prompt that installs the
// skills into an AI agent, where to get the access code, and prompts to try.

import { useState } from "react";
import { Check, Code2, Copy } from "lucide-react";

import { cn } from "@/lib/utils";
import { CARD, CONTRAST_BTN, MUTED_CARD, OUTLINE_BTN } from "./ui";

const WORKS_WITH = ["OpenClaw", "Claude Code", "Codex", "Cursor", "Windsurf", "Hermes", "NanoClaw"];

const INSTALL_PROMPT =
  "Read the Memorare Twin Agent Skills install guide and follow it. Ask me for any API keys you need.";

const TRY_PROMPTS: { prompt: string; blurb: string }[] = [
  {
    prompt:
      "Use memorare-twin-avatar and memorare-twin-video to make a 30-second cinematic intro of me as a founder. Ask me what you need.",
    blurb: "Full pipeline: avatar + style recommendation + video. The wow moment.",
  },
  {
    prompt: "I want to make a product launch video. Use memorare-twin-video and suggest the best style for it.",
    blurb: "Skill recommends from 20 curated styles (cinematic, editorial, clean tech, etc.)",
  },
  {
    prompt: "Use memorare-twin-video to summarize this article as a 60-second explainer from my avatar: [paste URL]",
    blurb: "Fetches content, extracts key points, scripts and generates the video.",
  },
  {
    prompt: "Use memorare-twin-video to turn the key points from this PDF into a video update for my team: [attach file]",
    blurb: "PDF → script → avatar video. Any content becomes a video message.",
  },
];

const INSTALLED = [
  {
    name: "memorare-twin-avatar",
    blurb:
      "Photo → persistent digital twin (face + voice). Asks about your look, setting, and tone before creating. Reusable across every video.",
  },
  {
    name: "memorare-twin-video",
    blurb:
      "Idea → script → video. Recommends styles, writes the script, handles aspect ratio, and delivers a share link.",
  },
];

const STEP_BADGE = "inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand)] to-[var(--brand-violet)]";

function CopyButton({ text, className, label = "Copy" }: { text: string; className: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
    >
      {copied ? <Check className="size-4" strokeWidth={1.75} aria-hidden /> : <Copy className="size-4" strokeWidth={1.75} aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}

function Step({ n, title, children, dark }: { n: number; title: string; children: React.ReactNode; dark: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={cn(STEP_BADGE, dark)}>{n}</span>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        <p className="text-sm text-[var(--muted-foreground)]">{children}</p>
      </div>
    </div>
  );
}

export function SkillsSection({ onNavigate }: { onNavigate: (section: "api") => void }) {
  return (
    <div className="w-full space-y-8 pb-4">
      <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)]">
        Teach your AI agent to create avatars and videos with Memorare Twin. One prompt to install. Your agent asks the
        right questions, builds your avatar, picks the best style, and delivers the video.
      </p>

      <section className="space-y-3">
        <p className="text-sm font-medium text-[var(--foreground)]">Works with</p>
        <div className="flex flex-wrap items-center gap-2">
          {WORKS_WITH.map((w) => (
            <span
              key={w}
              className="inline-flex items-center rounded-[8px] border border-[var(--border)] bg-[color-mix(in_oklab,var(--muted)_50%,transparent)] px-3 py-1 text-xs font-medium text-[var(--foreground)]"
            >
              {w}
            </span>
          ))}
          <span className="text-sm text-[var(--muted-foreground)]">+ more</span>
        </div>
      </section>

      <section className="space-y-3">
        <Step n={1} title="Install — copy this prompt and paste it into your AI agent" dark="dark:bg-none dark:bg-[#9870FD] dark:text-white">
          It reads the README, clones the repo, runs setup, and prompts you for your API key automatically.
        </Step>
        <div className={MUTED_CARD}>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <Code2 className="size-4" strokeWidth={1.75} aria-hidden />
            Install Prompt
          </div>
          <p className="font-mono text-sm leading-relaxed text-[var(--foreground)]">{INSTALL_PROMPT}</p>
          <div className="mt-4">
            <CopyButton text={INSTALL_PROMPT} className={CONTRAST_BTN} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <Step n={2} title="Get your API Key" dark="dark:bg-none dark:bg-[#FCCA1A] dark:text-[#1a1a1a]">
          Copy it from the{" "}
          <button type="button" onClick={() => onNavigate("api")} className="font-medium text-[#2563EB] underline-offset-2 hover:underline">
            API Keys
          </button>{" "}
          tab. The setup script will ask for it and save it permanently.
        </Step>
      </section>

      <section className="space-y-4">
        <Step n={3} title="Try it" dark="dark:bg-none dark:bg-[#3DCB61] dark:text-white">
          After installing, try these prompts. Your agent will ask the right questions before creating anything.
        </Step>
        <div className="space-y-3">
          {TRY_PROMPTS.map((p) => (
            <div key={p.prompt} className={cn(CARD, "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4")}>
              <div className="min-w-0 flex-1 space-y-1.5">
                <p className="font-mono text-sm leading-relaxed text-[var(--foreground)]">{p.prompt}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{p.blurb}</p>
              </div>
              <CopyButton text={p.prompt} className={cn(OUTLINE_BTN, "shrink-0 gap-1.5 px-3")} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">What gets installed</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {INSTALLED.map((i) => (
            <div key={i.name} className={MUTED_CARD}>
              <p className="font-mono text-sm font-semibold text-[var(--foreground)]">{i.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{i.blurb}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
