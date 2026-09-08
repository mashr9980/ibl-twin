/**
 * The signed-in member's library — their twin and the videos they made — read
 * from and written to /api/library, which keys it by platform username. So a
 * member sees only their own work, on any device, and two people sharing a
 * browser never see each other's.
 *
 * The library is cached in memory per session token; writes update the cache
 * first so the next page sees them at once, then reach the server.
 */

import { resolveAppTenant } from "@/lib/iblai/tenant";
import type { Library, LocalTwin, LocalVideo } from "@/lib/twin/library-types";

export type { Library, LocalTwin, LocalVideo, VideoKind } from "@/lib/twin/library-types";

const empty = (): Library => ({ twin: null, videos: [] });

let cache: { token: string; library: Library } | null = null;
let loading: Promise<Library> | null = null;

const token = () => (typeof window === "undefined" ? "" : localStorage.getItem("dm_token") ?? "");

function headers(): Record<string, string> {
  return { Authorization: `Token ${token()}`, "X-Platform": resolveAppTenant(), "Content-Type": "application/json" };
}

/** Records kept in localStorage by earlier versions, adopted once and then removed. */
function legacyLibrary(): Library | null {
  try {
    const tenant = resolveAppTenant();
    const twinRaw = localStorage.getItem(`twin.self:${tenant}`);
    const videosRaw = localStorage.getItem(`twin.videos:${tenant}`);
    if (!twinRaw && !videosRaw) return null;
    const lib: Library = {
      twin: twinRaw ? (JSON.parse(twinRaw) as LocalTwin) : null,
      videos: videosRaw ? (JSON.parse(videosRaw) as LocalVideo[]) : [],
    };
    localStorage.removeItem(`twin.self:${tenant}`);
    localStorage.removeItem(`twin.videos:${tenant}`);
    return lib;
  } catch {
    return null;
  }
}

async function save(library: Library): Promise<void> {
  const t = token();
  cache = { token: t, library };
  const res = await fetch("/api/library", { method: "PUT", headers: headers(), body: JSON.stringify(library), cache: "no-store" });
  if (!res.ok) throw new Error(`library: ${res.status}`);
}

/** The caller's library; one request per session, refreshed on demand. */
export async function loadLibrary({ fresh = false } = {}): Promise<Library> {
  const t = token();
  if (!t) return empty();
  if (!fresh && cache && cache.token === t) return cache.library;
  if (!fresh && loading) return loading;
  loading = (async () => {
    try {
      const res = await fetch("/api/library", { headers: headers(), cache: "no-store" });
      if (!res.ok) throw new Error(`library: ${res.status}`);
      let library = (await res.json()) as Library;
      // First visit since the move to the server: bring this browser's old records along.
      if (!library.twin && library.videos.length === 0) {
        const legacy = legacyLibrary();
        if (legacy && (legacy.twin || legacy.videos.length)) {
          library = legacy;
          await save(library).catch(() => {});
        }
      }
      cache = { token: t, library };
      return library;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export async function getTwin(): Promise<LocalTwin | null> {
  return (await loadLibrary()).twin;
}

export async function setTwin(twin: LocalTwin | null): Promise<void> {
  const lib = await loadLibrary();
  await save({ ...lib, twin });
}

export async function listVideos(): Promise<LocalVideo[]> {
  return (await loadLibrary()).videos;
}

export async function rememberVideo(video: LocalVideo): Promise<void> {
  const lib = await loadLibrary();
  await save({ ...lib, videos: [video, ...lib.videos.filter((v) => v.id !== video.id)] });
}

export async function forgetVideo(id: string): Promise<void> {
  const lib = await loadLibrary();
  await save({ ...lib, videos: lib.videos.filter((v) => v.id !== id) });
}

/** Forget the cached library, e.g. after sign-out. */
export function resetLibraryCache(): void {
  cache = null;
  loading = null;
}
