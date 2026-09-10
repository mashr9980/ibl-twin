// Each member's library — their twin and the videos they made — lives in the
// platform's per-user, per-platform metadata (the ibl.ai parallel for
// lightweight app state), under its own top-level key so writes never collide
// with the preferences the browser saves under `twin`. The platform merges
// top-level keys on PATCH.
//
// Libraries an earlier build kept in .data/library.json are adopted the first
// time that member is seen, then the file is no longer consulted for them.
import { promises as fs } from "node:fs";
import path from "node:path";

import config from "@/lib/iblai/config";
import type { Library, LocalTwin, LocalVideo } from "@/lib/twin/library-types";

const MAX_VIDEOS = 500;
const KEY = "twin_library";

const legacyFile = () =>
  process.env.LIBRARY_STORE_FILE?.trim() || path.join(process.cwd(), ".data", "library.json");

const metadataUrl = () =>
  `${config.dmUrl()}/api/core/users/platform-metadata/?platform_key=${encodeURIComponent(config.mainTenantKey())}`;

export const emptyLibrary = (): Library => ({ twin: null, videos: [] });

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Keep only the fields the app writes, in the shapes it expects; anything else is dropped. */
export function sanitizeLibrary(input: unknown): Library {
  const raw = (input && typeof input === "object" ? input : {}) as { twin?: unknown; videos?: unknown };
  const t = raw.twin && typeof raw.twin === "object" ? (raw.twin as Record<string, unknown>) : null;
  const twin: LocalTwin | null =
    t && str(t.groupId)
      ? {
          groupId: str(t.groupId),
          lookId: str(t.lookId) || undefined,
          name: str(t.name) || "My Twin",
          imageUrl: str(t.imageUrl) || undefined,
          createdAt: Number(t.createdAt) || Date.now(),
        }
      : null;
  const videos: LocalVideo[] = (Array.isArray(raw.videos) ? raw.videos : [])
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object" && !!str((v as Record<string, unknown>).id))
    .slice(0, MAX_VIDEOS)
    .map((v) => ({
      id: str(v.id),
      title: str(v.title),
      kind: v.kind === "twin" || v.kind === "clip" ? v.kind : "avatar",
      orientation: v.orientation === "portrait" ? "portrait" : "landscape",
      avatarName: str(v.avatarName) || undefined,
      createdAt: Number(v.createdAt) || Date.now(),
    }));
  return { twin, videos };
}

export class PlatformUnavailableError extends Error {
  constructor(status: number) {
    super(`platform metadata ${status}`);
    this.name = "PlatformUnavailableError";
  }
}

async function readMetadata(token: string): Promise<Record<string, unknown>> {
  const res = await fetch(metadataUrl(), { headers: { Authorization: `Token ${token}` }, cache: "no-store" });
  if (!res.ok) throw new PlatformUnavailableError(res.status);
  const body = (await res.json().catch(() => ({}))) as { metadata?: Record<string, unknown> };
  return body.metadata && typeof body.metadata === "object" ? body.metadata : {};
}

async function legacyLibrary(username: string): Promise<Library | null> {
  try {
    const all = JSON.parse(await fs.readFile(legacyFile(), "utf8")) as Record<string, unknown>;
    return username in all ? sanitizeLibrary(all[username]) : null;
  } catch {
    return null;
  }
}

/** The caller's library. `username` is only used to find a library an older build left on disk. */
export async function getLibrary(token: string, username: string): Promise<Library> {
  const metadata = await readMetadata(token);
  if (KEY in metadata) return sanitizeLibrary(metadata[KEY]);
  const legacy = await legacyLibrary(username);
  if (legacy && (legacy.twin || legacy.videos.length)) return saveLibrary(token, legacy);
  return emptyLibrary();
}

export async function saveLibrary(token: string, library: unknown): Promise<Library> {
  const clean = sanitizeLibrary(library);
  const res = await fetch(metadataUrl(), {
    method: "PATCH",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: { [KEY]: clean } }),
    cache: "no-store",
  });
  if (!res.ok) throw new PlatformUnavailableError(res.status);
  return clean;
}
