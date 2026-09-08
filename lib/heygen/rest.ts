/**
 * HeyGen REST client (browser).
 *
 * Every call goes through our same-origin `/api/heygen/*` proxy, which
 * resolves the tenant's HeyGen key server-side. The browser only ever
 * presents its ibl.ai DM token, never a provider key.
 */
import {
  HEYGEN_CREDITS_EVENT,
  HEYGEN_USAGE_EVENT,
  isFreeLimit,
  isInsufficientCredit,
} from "@/lib/heygen/credential";
import { resolveAppTenant } from "@/lib/iblai/tenant";

const API_BASE = "/api/heygen";

/** Thrown when the tenant has no HeyGen credential registered yet. */
export class HeygenCredentialMissingError extends Error {
  constructor() {
    super("heygen_credential_missing");
    this.name = "HeygenCredentialMissingError";
  }
}

/** The workspace's HeyGen balance is used up; the banner is told at once. */
export class HeygenCreditsExhaustedError extends Error {
  constructor() {
    super("heygen_credits_exhausted");
    this.name = "HeygenCreditsExhaustedError";
  }
}

/** A free-plan member has used this month's free videos; the upgrade is the answer. */
export class HeygenFreeLimitError extends Error {
  constructor(public limit: number) {
    super("heygen_free_limit");
    this.name = "HeygenFreeLimitError";
  }
}

/** HeyGen answered 5xx or could not be reached; trying again usually works. */
export class HeygenBusyError extends Error {
  constructor() {
    super("heygen_busy");
    this.name = "HeygenBusyError";
  }
}

/** A step took longer than we are willing to keep the user waiting. */
export class HeygenTimeoutError extends Error {
  constructor() {
    super("heygen_timeout");
    this.name = "HeygenTimeoutError";
  }
}

/** HeyGen could not make a twin from that picture. */
export class HeygenPhotoRejectedError extends Error {
  constructor() {
    super("heygen_photo_rejected");
    this.name = "HeygenPhotoRejectedError";
  }
}

/** Any other HeyGen refusal, with the reason HeyGen gave when it gave one. */
export class HeygenRequestError extends Error {
  constructor(public status: number, public detail: string) {
    super(`heygen ${status}${detail ? `: ${detail}` : ""}`);
    this.name = "HeygenRequestError";
  }
}

/** The human-readable part of a HeyGen error body, if any. */
function heygenDetail(text: string): string {
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string } | string; message?: string };
    const msg = typeof parsed.error === "string" ? parsed.error : parsed.error?.message ?? parsed.message;
    return typeof msg === "string" ? msg.trim() : "";
  } catch {
    return "";
  }
}

/** One plain sentence for any HeyGen failure; `fallback` for the unknown ones. */
export function heygenErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof HeygenCredentialMissingError) return "HeyGen integration required. Ask the workspace owner to connect HeyGen.";
  if (err instanceof HeygenFreeLimitError) return "You've used your free videos for this month. Upgrade for unlimited videos.";
  if (err instanceof HeygenCreditsExhaustedError)
    return "HeyGen doesn't have enough credits for this video. The workspace owner can add credits in HeyGen; a shorter script needs fewer.";
  if (err instanceof HeygenBusyError) return "HeyGen is busy right now. Please try again in a moment.";
  if (err instanceof HeygenTimeoutError) return "This is taking longer than usual. Please try again in a moment.";
  if (err instanceof HeygenPhotoRejectedError) return "HeyGen couldn't use that picture. Try a clear, front-facing photo of one person.";
  if (err instanceof Error && /413|too large/i.test(err.message)) return "File too large. Please use a smaller file.";
  if (err instanceof HeygenRequestError && err.detail) return `${fallback} HeyGen said: ${err.detail.replace(/\.?$/, ".")}`;
  return fallback;
}

async function failure(path: string, res: Response): Promise<Error> {
  const text = await res.text().catch(() => "");
  if (res.status >= 500) return new HeygenBusyError();
  if (isInsufficientCredit(text)) {
    window.dispatchEvent(new Event(HEYGEN_CREDITS_EVENT));
    return new HeygenCreditsExhaustedError();
  }
  if (res.status === 402 && isFreeLimit(text)) {
    window.dispatchEvent(new Event(HEYGEN_USAGE_EVENT));
    let limit = 0;
    try {
      limit = Number(JSON.parse(text).limit ?? 0);
    } catch {
      /* the banner re-asks anyway */
    }
    return new HeygenFreeLimitError(limit);
  }
  return new HeygenRequestError(res.status, heygenDetail(text).slice(0, 200));
}

/** Paths whose success counts against the free plan; the banner is told at once. */
const GENERATIONS = new Set(["/v2/video/generate", "/v3/videos"]);

function authHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem("dm_token") ?? "";
  if (!token) throw new Error("heygen: missing DM token (not authenticated)");
  const platform = resolveAppTenant();
  if (!platform) throw new Error("heygen: no tenant resolved");
  return { Authorization: `Token ${token}`, "X-Platform": platform };
}

const REQUEST_TIMEOUT_MS = 60_000;
const UPLOAD_TIMEOUT_MS = 180_000;

/** fetch that gives up (HeygenTimeoutError) or reports the network as busy instead of hanging. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw new HeygenTimeoutError();
    throw new HeygenBusyError();
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(
  path: string,
  init: { query?: Record<string, string | number | undefined>; method?: string; body?: unknown } = {},
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [k, v] of Object.entries(init.query ?? {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const headers: Record<string, string> = { Accept: "application/json", ...authHeaders() };
  let body: BodyInit | undefined;
  if (init.body instanceof FormData) {
    body = init.body;
  } else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers["Content-Type"] = "application/json";
  }

  const res = await fetchWithTimeout(url.toString(), { method: init.method ?? "GET", headers, body });
  if (res.status === 424) throw new HeygenCredentialMissingError();
  if (!res.ok) throw await failure(path, res);
  if ((init.method ?? "GET") === "POST" && GENERATIONS.has(path))
    window.dispatchEvent(new Event(HEYGEN_USAGE_EVENT));
  return (await res.json()) as T;
}

/** HeyGen wraps successful payloads in `{data: …}`. */
function unwrap<T>(res: { data?: T } & Partial<T>): T {
  return (res.data as T | undefined) ?? (res as T);
}

export interface HeygenAvatar {
  avatar_id: string;
  avatar_name: string;
  gender?: string | null;
  preview_image_url?: string | null;
  preview_video_url?: string | null;
}

export interface HeygenTalkingPhoto {
  talking_photo_id: string;
  talking_photo_name?: string | null;
  preview_image_url?: string | null;
}

export interface AvatarCatalogue {
  avatars: HeygenAvatar[];
  talkingPhotos: HeygenTalkingPhoto[];
}

/**
 * The catalogue is ~3.9 MB and takes >10s upstream, and it does not change
 * between screens. Fetch it once per session and share the in-flight promise,
 * so moving Gallery → picker → Create Twin costs nothing instead of a fresh
 * 12-second download each time.
 */
let cataloguePromise: Promise<AvatarCatalogue> | null = null;

/**
 * The in-memory promise only survives client-side navigation. A hard load —
 * typing a URL, refreshing, following a link from outside — starts a fresh
 * module and pays the full 1.6 MB / ~15 s download again.
 *
 * sessionStorage bridges that. Only the four fields the UI renders are kept,
 * which turns ~3.9 MB of JSON into a few hundred KB, comfortably inside the
 * quota; a quota failure just means no cache, never a broken page.
 */
const CACHE_KEY = "twin.avatars.v1";
const CACHE_TTL_MS = 30 * 60 * 1000;

type SlimAvatar = Pick<HeygenAvatar, "avatar_id" | "avatar_name" | "gender" | "preview_image_url">;

function readSessionCache(): HeygenAvatar[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, avatars } = JSON.parse(raw) as { at: number; avatars: SlimAvatar[] };
    if (!Array.isArray(avatars) || Date.now() - at > CACHE_TTL_MS) return null;
    return avatars as HeygenAvatar[];
  } catch {
    return null;
  }
}

function writeSessionCache(avatars: HeygenAvatar[]): void {
  if (typeof window === "undefined") return;
  try {
    const slim: SlimAvatar[] = avatars.map((a) => ({
      avatar_id: a.avatar_id,
      avatar_name: a.avatar_name,
      gender: a.gender,
      preview_image_url: a.preview_image_url,
    }));
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), avatars: slim }));
  } catch {
    /* over quota or storage disabled — caching is an optimisation, not a requirement */
  }
}

/** GET /v2/avatars — the stock catalogue plus this account's talking photos. */
export function listHeygenAvatars(): Promise<AvatarCatalogue> {
  if (cataloguePromise) return cataloguePromise;
  const cached = readSessionCache();
  if (cached) {
    cataloguePromise = Promise.resolve({ avatars: cached, talkingPhotos: [] });
    return cataloguePromise;
  }
  cataloguePromise = (async () => {
    const data = unwrap<{ avatars?: HeygenAvatar[]; talking_photos?: HeygenTalkingPhoto[] }>(
      await request("/v2/avatars"),
    );
    const avatars = data.avatars ?? [];
    writeSessionCache(avatars);
    return { avatars, talkingPhotos: data.talking_photos ?? [] };
  })().catch((err) => {
    cataloguePromise = null; // a failure must not be cached
    throw err;
  });
  return cataloguePromise;
}

/** Drop the cached catalogue so the next call refetches (used by Retry). */
export function invalidateAvatarCatalogue(): void {
  cataloguePromise = null;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(CACHE_KEY);
    } catch {
      /* nothing to clear */
    }
  }
}

export interface HeygenVoice {
  voice_id: string;
  name?: string | null;
  language?: string | null;
  gender?: string | null;
  preview_audio?: string | null;
  /** HeyGen returns these as strings ("True"/"False") on some plans. */
  is_cloneable?: boolean | string | null;
  emotion_support?: boolean | string | null;
}

/** GET /v2/voices */
export async function listHeygenVoices(): Promise<HeygenVoice[]> {
  const data = unwrap<{ voices?: HeygenVoice[] }>(await request("/v2/voices"));
  return data.voices ?? [];
}

// ─────────────────────────────────────────────────────────────────────
// Assets + photo twins (HeyGen "photo avatar" groups)
//
// Create Twin pipeline:
//   1. POST /v1/asset                              (upload.heygen.com) → {id, image_key, url}
//   2. POST /v2/photo_avatar/avatar_group/create   {name, image_key}   → {group_id}
//   3. GET  /v2/avatar_group/{group_id}/avatars    poll until the look's status === "completed"
// The look is a talking photo, usable at once as talking_photo_id in
// /v2/video/generate. No training: it costs credits and adds nothing here.

export interface HeygenUploadedAsset {
  id: string;
  image_key?: string;
  url?: string;
  file_type?: string;
}

export async function uploadHeygenAsset(file: File | Blob): Promise<HeygenUploadedAsset> {
  const res = await fetchWithTimeout(
    `${API_BASE}/v1/asset`,
    {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": file.type || "application/octet-stream",
        Accept: "application/json",
      },
      body: file,
    },
    UPLOAD_TIMEOUT_MS,
  );
  if (res.status === 424) throw new HeygenCredentialMissingError();
  if (!res.ok) throw await failure("/v1/asset", res);
  return unwrap(await res.json());
}

export interface HeygenPhotoAvatarGroup {
  group_id: string;
  id?: string;
  image_url?: string;
}

export async function createPhotoAvatarGroup(input: {
  name: string;
  image_key: string;
}): Promise<HeygenPhotoAvatarGroup> {
  return unwrap(
    await request<{ data?: HeygenPhotoAvatarGroup } & Partial<HeygenPhotoAvatarGroup>>(
      "/v2/photo_avatar/avatar_group/create",
      { method: "POST", body: input },
    ),
  );
}

export interface HeygenPhotoAvatarLook {
  id: string;
  group_id: string;
  name?: string;
  status: "pending" | "completed" | "failed" | string;
  image_url?: string;
}

export async function getPhotoAvatarLook(groupId: string): Promise<HeygenPhotoAvatarLook> {
  const data = unwrap<{ avatar_list?: HeygenPhotoAvatarLook[] }>(
    await request(`/v2/avatar_group/${encodeURIComponent(groupId)}/avatars`),
  );
  const look = data.avatar_list?.[0];
  if (!look) throw new Error("heygen: avatar group has no looks yet");
  return look;
}

/**
 * Wait until HeyGen has processed the uploaded picture into a look. Transient
 * poll failures are retried until the deadline; a rejected picture and a
 * deadline are reported as their own errors.
 */
export async function waitForLook(
  groupId: string,
  { intervalMs = 2000, timeoutMs = 90_000 } = {},
): Promise<HeygenPhotoAvatarLook> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const look = await getPhotoAvatarLook(groupId).catch((err: unknown) => {
      if (err instanceof HeygenCredentialMissingError) throw err;
      return null;
    });
    if (look?.status === "completed") return look;
    if (look?.status === "failed") throw new HeygenPhotoRejectedError();
    if (Date.now() > deadline) throw new HeygenTimeoutError();
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

// ─────────────────────────────────────────────────────────────────────
// Video generation + library

export type Orientation = "landscape" | "portrait";
const DIMENSIONS: Record<Orientation, { width: number; height: number }> = {
  landscape: { width: 1280, height: 720 },
  portrait: { width: 720, height: 1280 },
};

export interface CreateVideoInput {
  avatar_id: string;
  /** Set for the user's twin: the look is addressed as a talking photo, not a studio avatar. */
  talking_photo?: boolean;
  voice_id: string;
  script: string;
  title: string;
  orientation: Orientation;
  /** 0.5 – 1.5, HeyGen's supported TTS speed range. */
  speed?: number;
}

export async function createVideo(input: CreateVideoInput): Promise<{ video_id: string }> {
  return unwrap(
    await request<{ data?: { video_id: string } } & Partial<{ video_id: string }>>("/v2/video/generate", {
      method: "POST",
      body: {
        title: input.title,
        dimension: DIMENSIONS[input.orientation],
        video_inputs: [
          {
            character: input.talking_photo
              ? { type: "talking_photo", talking_photo_id: input.avatar_id }
              : { type: "avatar", avatar_id: input.avatar_id, avatar_style: "normal" },
            voice: {
              type: "text",
              voice_id: input.voice_id,
              input_text: input.script,
              ...(input.speed && input.speed !== 1 ? { speed: input.speed } : {}),
            },
          },
        ],
      },
    }),
  );
}

export interface HeygenVideo {
  id: string;
  title?: string | null;
  status: "pending" | "processing" | "completed" | "failed" | string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  duration?: number | null;
  created_at?: number | string | null;
  error?: { message?: string } | string | null;
}

export async function listVideos(opts: { limit?: number; token?: string } = {}): Promise<{
  data: HeygenVideo[];
  next_token: string | null;
}> {
  const res = await request<{ data?: HeygenVideo[]; next_token?: string | null }>("/v3/videos", {
    query: { limit: opts.limit ?? 50, token: opts.token },
  });
  return { data: res.data ?? [], next_token: res.next_token ?? null };
}

export async function getVideo(videoId: string): Promise<HeygenVideo> {
  return unwrap(
    await request<{ data?: HeygenVideo } & Partial<HeygenVideo>>(
      `/v3/videos/${encodeURIComponent(videoId)}`,
    ),
  );
}

export async function deleteVideo(videoId: string): Promise<void> {
  await request(`/v1/video.delete`, { query: { video_id: videoId }, method: "DELETE" });
}

// ─────────────────────────────────────────────────────────────────────
// Image → video clip (/v3/videos, "image" variant)

export interface CreateClipInput {
  image_asset_id?: string;
  image_url?: string;
  motion_prompt?: string;
  script?: string;
  voice_id?: string;
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  title?: string;
  /** Clip length in seconds. Twin offers 5-8; HeyGen defaults to 5. */
  duration?: number;
}

export async function createVideoClip(input: CreateClipInput): Promise<{ video_id: string }> {
  return unwrap(
    await request<{ data?: { video_id: string } } & Partial<{ video_id: string }>>("/v3/videos", {
      method: "POST",
      body: {
        title: input.title,
        aspect_ratio: input.aspect_ratio ?? "16:9",
        video_inputs: [
          {
            character: input.image_asset_id
              ? { type: "image", image_asset_id: input.image_asset_id }
              : { type: "image", image_url: input.image_url },
            ...(input.motion_prompt ? { motion_prompt: input.motion_prompt } : {}),
            ...(input.duration ? { duration: input.duration } : {}),
            ...(input.script && input.voice_id
              ? { voice: { type: "text", voice_id: input.voice_id, input_text: input.script } }
              : {}),
          },
        ],
      },
    }),
  );
}
