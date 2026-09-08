// Each member's library — their twin and the videos they made — kept in a JSON
// file on the server (LIBRARY_STORE_FILE, default .data/library.json), keyed
// by platform username. Writes are serialised in process; this app runs as one
// Node process on its own machine.
import { promises as fs } from "node:fs";
import path from "node:path";

import type { Library, LocalTwin, LocalVideo } from "@/lib/twin/library-types";

const MAX_VIDEOS = 500;

const file = () =>
  process.env.LIBRARY_STORE_FILE?.trim() || path.join(process.cwd(), ".data", "library.json");

let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}

async function readAll(): Promise<Record<string, Library>> {
  try {
    const parsed = JSON.parse(await fs.readFile(file(), "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

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

export async function getLibrary(username: string): Promise<Library> {
  const all = await readAll();
  return sanitizeLibrary(all[username] ?? emptyLibrary());
}

export function saveLibrary(username: string, library: unknown): Promise<Library> {
  return serialize(async () => {
    const all = await readAll();
    const clean = sanitizeLibrary(library);
    all[username] = clean;
    await fs.mkdir(path.dirname(file()), { recursive: true });
    await fs.writeFile(file(), JSON.stringify(all, null, 2), "utf8");
    return clean;
  });
}
