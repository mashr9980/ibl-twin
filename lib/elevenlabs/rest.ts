// Browser-side ElevenLabs calls, through this app's own route so the key
// never reaches the browser. Cloning is instant: the voice exists as soon as
// the request returns.

import { resolveAppTenant } from "@/lib/iblai/tenant";

const API_BASE = "/api/elevenlabs";
const REQUEST_TIMEOUT_MS = 120_000;

/** A voice this member cloned; the server lists nobody else's. */
export interface ClonedVoice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string | null;
  preview_url?: string | null;
  labels?: Record<string, string> | null;
}

/** What the generator says when a cloned voice is previewed. */
export const PREVIEW_TEXT = "Hi, this is my cloned voice. Here's how I sound.";

export interface ElevenLabsStatus {
  ok: boolean;
  reason?: "no_key" | "bad_key" | "lookup_failed" | "unavailable";
  canClone?: boolean;
  slotsFree?: boolean;
  charactersLeft?: number;
  slots?: { used: number; limit: number };
  characters?: { used: number; limit: number };
}

export class ElevenLabsCredentialMissingError extends Error {
  constructor() {
    super("elevenlabs_credential_missing");
    this.name = "ElevenLabsCredentialMissingError";
  }
}

/** Any refusal from ElevenLabs, with the reason it gave. */
export class ElevenLabsRequestError extends Error {
  constructor(public status: number, public code: string, public detail: string) {
    super(`elevenlabs ${status} ${code}${detail ? `: ${detail}` : ""}`);
    this.name = "ElevenLabsRequestError";
  }
}

/** ElevenLabs answers `{detail: {status, message}}` or `{detail: [{msg}]}` (validation). */
function parseFailure(text: string): { code: string; detail: string } {
  try {
    const parsed = JSON.parse(text) as { detail?: unknown };
    const d = parsed.detail;
    if (Array.isArray(d)) return { code: "validation", detail: String((d[0] as { msg?: string })?.msg ?? "") };
    if (d && typeof d === "object") {
      const o = d as { status?: string; code?: string; message?: string };
      return { code: String(o.status ?? o.code ?? ""), detail: String(o.message ?? "") };
    }
    if (typeof d === "string") return { code: "", detail: d };
  } catch {
    /* not JSON */
  }
  return { code: "", detail: "" };
}

export const isElevenLabsError = (err: unknown) =>
  err instanceof ElevenLabsCredentialMissingError || err instanceof ElevenLabsRequestError;

/** One plain sentence for any ElevenLabs failure. */
export function elevenLabsErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ElevenLabsCredentialMissingError) return "Voice cloning isn't set up for this workspace yet. Ask the workspace owner to connect ElevenLabs.";
  if (err instanceof ElevenLabsRequestError) {
    if (/can_not_use_instant_voice_cloning|instant_voice_cloning/i.test(err.code)) return "This workspace's ElevenLabs plan doesn't include instant voice cloning.";
    if (/voice_limit|voice_add_edit_limit|too_many_voices/i.test(err.code)) return "The workspace has used all of its ElevenLabs voice slots. Delete a voice to make room.";
    if (/quota_exceeded|character_limit/i.test(err.code)) return "The workspace has used its ElevenLabs characters for this month, so no speech can be made until it renews.";
    if (/invalid_api_key|unauthorized/i.test(err.code) || err.status === 401) return "The workspace's ElevenLabs key was refused. Ask the workspace owner to check it.";
    if (err.status === 404) return "That cloned voice is no longer available. Pick another voice.";
    if (err.status === 429) return "ElevenLabs is busy right now. Please try again in a moment.";
    if (err.status >= 500) return "ElevenLabs is having trouble right now. Please try again in a moment.";
    if (err.detail) return `${fallback} ElevenLabs said: ${err.detail.replace(/\.?$/, ".")}`;
  }
  if (err instanceof Error && err.name === "AbortError") return "This is taking longer than usual. Please try again in a moment.";
  return fallback;
}

function authHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem("dm_token") ?? "";
  const platform = resolveAppTenant();
  if (!token || !platform) throw new Error("elevenlabs: not signed in");
  return { Authorization: `Token ${token}`, "X-Platform": platform };
}

async function call(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/${path}`, { ...init, headers: { ...authHeaders(), ...(init.headers as Record<string, string>) }, signal: controller.signal, cache: "no-store" });
    if (res.status === 424) throw new ElevenLabsCredentialMissingError();
    if (!res.ok) {
      const { code, detail } = parseFailure(await res.text().catch(() => ""));
      throw new ElevenLabsRequestError(res.status, code, detail);
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function elevenLabsStatus(): Promise<ElevenLabsStatus> {
  const res = await fetch(`${API_BASE}/status`, { headers: authHeaders(), cache: "no-store" });
  if (!res.ok) return { ok: false, reason: "unavailable" };
  return (await res.json()) as ElevenLabsStatus;
}

export async function listClonedVoices(): Promise<ClonedVoice[]> {
  const res = await call("v1/voices");
  const body = (await res.json()) as { voices?: ClonedVoice[] };
  return body.voices ?? [];
}

/** Instant clone from one recording; the voice is usable as soon as this returns. */
export async function cloneVoiceFromRecording(input: { name: string; file: File | Blob }): Promise<{ voice_id: string }> {
  const form = new FormData();
  form.append("name", input.name);
  form.append("files", input.file, input.file instanceof File ? input.file.name : "recording.wav");
  const res = await call("v1/voices/add", { method: "POST", body: form });
  return (await res.json()) as { voice_id: string };
}

export async function deleteClonedVoice(voiceId: string): Promise<void> {
  await call(`v1/voices/${encodeURIComponent(voiceId)}`, { method: "DELETE" });
}

/** ElevenLabs accepts 0.7–1.2; the sliders offer 0.5–1.5. */
export const clampSpeed = (speed: number) => Math.min(1.2, Math.max(0.7, Math.round(speed * 10) / 10));

/** Speech in a cloned voice, as an MP3 blob. */
export async function speakWithVoice(voiceId: string, text: string, speed = 1): Promise<Blob> {
  const res = await call(`v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      ...(speed !== 1 ? { voice_settings: { speed: clampSpeed(speed) } } : {}),
    }),
  });
  return await res.blob();
}

/** Ids of cloned voices are ElevenLabs ids; HeyGen ids never look like this prefix. */
export const CLONED_PREFIX = "el:";
export const asClonedVoiceId = (voiceId: string) => `${CLONED_PREFIX}${voiceId}`;
export const clonedVoiceId = (id: string) => (id.startsWith(CLONED_PREFIX) ? id.slice(CLONED_PREFIX.length) : null);
