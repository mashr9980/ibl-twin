import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { getLibrary, sanitizeLibrary, saveLibrary } from "@/lib/library-store";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "twin-lib-"));
  process.env.LIBRARY_STORE_FILE = path.join(dir, "library.json");
});
afterEach(() => {
  delete process.env.LIBRARY_STORE_FILE;
  rmSync(dir, { recursive: true, force: true });
});

describe("library store", () => {
  it("starts empty and keeps each member's library apart", async () => {
    expect(await getLibrary("ann")).toEqual({ twin: null, videos: [] });
    await saveLibrary("ann", { twin: { groupId: "g1", name: "My Twin", createdAt: 1 }, videos: [{ id: "v1", title: "Hi", kind: "twin", orientation: "landscape", createdAt: 2 }] });
    await saveLibrary("bob", { twin: null, videos: [{ id: "v2", title: "Yo", kind: "avatar", orientation: "portrait", createdAt: 3 }] });
    expect((await getLibrary("ann")).videos.map((v) => v.id)).toEqual(["v1"]);
    expect((await getLibrary("ann")).twin?.groupId).toBe("g1");
    expect((await getLibrary("bob")).videos.map((v) => v.id)).toEqual(["v2"]);
    expect((await getLibrary("bob")).twin).toBeNull();
  });

  it("serialises concurrent writes", async () => {
    await Promise.all(Array.from({ length: 10 }, (_, i) => saveLibrary(`u${i}`, { twin: null, videos: [{ id: `v${i}`, title: "", kind: "clip", orientation: "landscape", createdAt: i }] })));
    for (let i = 0; i < 10; i++) expect((await getLibrary(`u${i}`)).videos[0]?.id).toBe(`v${i}`);
  });
});

describe("sanitizeLibrary", () => {
  it("drops junk and keeps only known fields", () => {
    const out = sanitizeLibrary({
      twin: { groupId: "g", name: 5, evil: "<script>", createdAt: "x" },
      videos: [{ id: "a", kind: "weird", orientation: "sideways" }, null, "nope", { title: "no id" }],
    });
    expect(out.twin).toMatchObject({ groupId: "g", name: "My Twin" });
    expect(out.twin && "evil" in out.twin).toBe(false);
    expect(out.videos).toEqual([{ id: "a", title: "", kind: "avatar", orientation: "landscape", avatarName: undefined, createdAt: expect.any(Number) }]);
    expect(sanitizeLibrary(null)).toEqual({ twin: null, videos: [] });
    expect(sanitizeLibrary({ twin: { name: "no group id" } }).twin).toBeNull();
  });
});
