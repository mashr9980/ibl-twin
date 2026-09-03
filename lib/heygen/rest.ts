/**
 * HeyGen REST client (browser).
 *
 * Every call goes through our same-origin `/api/heygen/*` proxy, which
 * resolves the tenant's HeyGen key server-side. The browser only ever
 * presents its ibl.ai DM token, never a provider key.
 */
import { resolveAppTenant } from "@/lib/iblai/tenant";

const API_BASE = "/api/heygen";

/** Thrown when the tenant has no HeyGen credential registered yet. */
export class HeygenCredentialMissingError extends Error {
  constructor() {
    super("heygen_credential_missing");
    this.name = "HeygenCredentialMissingError";
  }
}

function authHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? "" : localStorage.getItem("dm_token") ?? "";
  if (!token) throw new Error("heygen: missing DM token (not authenticated)");
  const platform = resolveAppTenant();
  if (!platform) throw new Error("heygen: no tenant resolved");
  return { Authorization: `Token ${token}`, "X-Platform": platform };
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

  const res = await fetch(url.toString(), { method: init.method ?? "GET", headers, body });
  if (res.status === 424) throw new HeygenCredentialMissingError();
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`heygen ${path}: ${res.status} ${text.slice(0, 200)}`);
  }
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

/** GET /v2/avatars — the stock catalogue plus this account's talking photos. */
export function listHeygenAvatars(): Promise<AvatarCatalogue> {
  if (cataloguePromise) return cataloguePromise;
  cataloguePromise = (async () => {
    const data = unwrap<{ avatars?: HeygenAvatar[]; talking_photos?: HeygenTalkingPhoto[] }>(
      await request("/v2/avatars"),
    );
    return { avatars: data.avatars ?? [], talkingPhotos: data.talking_photos ?? [] };
  })().catch((err) => {
    cataloguePromise = null; // a failure must not be cached
    throw err;
  });
  return cataloguePromise;
}

/** Drop the cached catalogue so the next call refetches (used by Retry). */
export function invalidateAvatarCatalogue(): void {
  cataloguePromise = null;
}

export interface HeygenVoice {
  voice_id: string;
  name?: string | null;
  language?: string | null;
  gender?: string | null;
  preview_audio?: string | null;
}

/** GET /v2/voices */
export async function listHeygenVoices(): Promise<HeygenVoice[]> {
  const data = unwrap<{ voices?: HeygenVoice[] }>(await request("/v2/voices"));
  return data.voices ?? [];
}

// ─────────────────────────────────────────────────────────────────────
// Assets + photo twins (HeyGen "photo avatar" groups)
//
// Create Twin pipeline, matching iblai/video:
//   1. POST /v1/asset                              (upload.heygen.com) → {id, image_key, url}
//   2. POST /v2/photo_avatar/avatar_group/create   {name, image_key}   → {group_id}
//   3. GET  /v2/avatar_group/{group_id}/avatars    poll until look status === "completed"
//   4. POST /v2/photo_avatar/train                 {group_id}
// The trained group is then usable as an avatar_id in /v2/video/generate.

export interface HeygenUploadedAsset {
  id: string;
  image_key?: string;
  url?: string;
  file_type?: string;
}

export async function uploadHeygenAsset(file: File | Blob): Promise<HeygenUploadedAsset> {
  const res = await fetch(`${API_BASE}/v1/asset`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": file.type || "application/octet-stream",
      Accept: "application/json",
    },
    body: file,
  });
  if (res.status === 424) throw new HeygenCredentialMissingError();
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`heygen /v1/asset: ${res.status} ${text.slice(0, 200)}`);
  }
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

export async function trainPhotoAvatarGroup(groupId: string): Promise<void> {
  await request("/v2/photo_avatar/train", { method: "POST", body: { group_id: groupId } });
}

/** Wait for the uploaded photo to finish processing, then kick off training. */
export async function finalizeAndTrain(
  groupId: string,
  { intervalMs = 2000, timeoutMs = 90_000 } = {},
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const look = await getPhotoAvatarLook(groupId);
    if (look.status === "completed") break;
    if (look.status === "failed") throw new Error("HeyGen photo processing failed");
    if (Date.now() > deadline) throw new Error("HeyGen photo processing timed out");
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  await trainPhotoAvatarGroup(groupId);
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
            character: { type: "avatar", avatar_id: input.avatar_id, avatar_style: "normal" },
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
            ...(input.script && input.voice_id
              ? { voice: { type: "text", voice_id: input.voice_id, input_text: input.script } }
              : {}),
          },
        ],
      },
    }),
  );
}
