/**
 * Per-tenant bookkeeping the HeyGen API doesn't hold for us: which video is a
 * twin vs a catalogue avatar vs a clip, and which avatar group is the user's
 * own twin (one per account).
 *
 * twin.memorare.ai keeps this in its own database; iblai/video keeps it in
 * ibl.ai catalog resources. Both are more than a two-day build needs, so this
 * uses localStorage keyed by tenant. The trade-off is that the labels don't
 * roam across devices — HeyGen still holds the videos themselves, so nothing
 * is lost, only the filter chip a video appears under.
 */

export type VideoKind = "twin" | "avatar" | "clip";

export interface LocalVideo {
  id: string;
  title: string;
  kind: VideoKind;
  orientation: "landscape" | "portrait";
  avatarName?: string;
  createdAt: number;
}

export interface LocalTwin {
  groupId: string;
  name: string;
  imageUrl?: string;
  createdAt: number;
}

const videosKey = (tenant: string) => `twin.videos:${tenant}`;
const twinKey = (tenant: string) => `twin.self:${tenant}`;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function listLocalVideos(tenant: string): LocalVideo[] {
  return read<LocalVideo[]>(videosKey(tenant), []);
}

export function rememberVideo(tenant: string, video: LocalVideo): void {
  const list = listLocalVideos(tenant).filter((v) => v.id !== video.id);
  localStorage.setItem(videosKey(tenant), JSON.stringify([video, ...list]));
}

export function forgetVideo(tenant: string, id: string): void {
  localStorage.setItem(videosKey(tenant), JSON.stringify(listLocalVideos(tenant).filter((v) => v.id !== id)));
}

export function getLocalTwin(tenant: string): LocalTwin | null {
  return read<LocalTwin | null>(twinKey(tenant), null);
}

export function setLocalTwin(tenant: string, twin: LocalTwin | null): void {
  if (twin) localStorage.setItem(twinKey(tenant), JSON.stringify(twin));
  else localStorage.removeItem(twinKey(tenant));
}
