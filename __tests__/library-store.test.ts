import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { getLibrary, PlatformUnavailableError, sanitizeLibrary, saveLibrary } from "@/lib/library-store";

/** A fake platform: one metadata object per token, PATCH merges top-level keys. */
let store: Record<string, Record<string, unknown>>;
let calls: { method: string; token: string; body?: unknown }[];
let dir: string;

beforeEach(() => {
  store = {};
  calls = [];
  dir = mkdtempSync(path.join(tmpdir(), "twin-lib-"));
  process.env.LIBRARY_STORE_FILE = path.join(dir, "library.json");
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const token = String((init.headers as Record<string, string>).Authorization).replace("Token ", "");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, token, body });
    if (token === "broken") return new Response("nope", { status: 503 });
    store[token] ??= {};
    if (method === "PATCH") store[token] = { ...store[token], ...body.metadata };
    return new Response(JSON.stringify({ metadata: store[token] }), { status: 200 });
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.LIBRARY_STORE_FILE;
  rmSync(dir, { recursive: true, force: true });
});

const video = { id: "v1", title: "Hi", kind: "twin", orientation: "landscape", createdAt: 2 };

describe("library store on platform metadata", () => {
  it("starts empty and keeps members apart by their own token", async () => {
    expect(await getLibrary("tok-ann", "ann")).toEqual({ twin: null, videos: [] });
    await saveLibrary("tok-ann", { twin: { groupId: "g1", name: "My Twin", createdAt: 1 }, videos: [video] });
    await saveLibrary("tok-bob", { twin: null, videos: [{ ...video, id: "v2" }] });
    expect((await getLibrary("tok-ann", "ann")).videos.map((v) => v.id)).toEqual(["v1"]);
    expect((await getLibrary("tok-ann", "ann")).twin?.groupId).toBe("g1");
    expect((await getLibrary("tok-bob", "bob")).videos.map((v) => v.id)).toEqual(["v2"]);
  });

  it("writes only its own key, so preferences saved under `twin` survive", async () => {
    store["tok-ann"] = { twin: { theme: "dark" }, apps: { other: 1 } };
    await saveLibrary("tok-ann", { twin: null, videos: [video] });
    expect(store["tok-ann"].twin).toEqual({ theme: "dark" });
    expect(store["tok-ann"].apps).toEqual({ other: 1 });
    expect(calls.at(-1)?.body).toEqual({ metadata: { twin_library: { twin: null, videos: [video] } } });
  });

  it("adopts a library an older build left on disk, once", async () => {
    writeFileSync(process.env.LIBRARY_STORE_FILE!, JSON.stringify({ ann: { twin: { groupId: "old", name: "My Twin", createdAt: 1 }, videos: [] } }));
    const lib = await getLibrary("tok-ann", "ann");
    expect(lib.twin?.groupId).toBe("old");
    expect(calls.some((c) => c.method === "PATCH")).toBe(true);
    // second read comes from the platform, not the file
    calls = [];
    await getLibrary("tok-ann", "ann");
    expect(calls.map((c) => c.method)).toEqual(["GET"]);
  });

  it("reports the platform being unavailable instead of pretending the library is empty", async () => {
    await expect(getLibrary("broken", "x")).rejects.toBeInstanceOf(PlatformUnavailableError);
  });
});

describe("sanitizeLibrary", () => {
  it("drops junk and keeps only known fields", () => {
    const out = sanitizeLibrary({ twin: { groupId: "g", name: 5, evil: "<script>", createdAt: "x" }, videos: [{ id: "a", kind: "weird", orientation: "sideways" }, null, "nope", { title: "no id" }] });
    expect(out.twin).toMatchObject({ groupId: "g", name: "My Twin" });
    expect(out.videos).toEqual([{ id: "a", title: "", kind: "avatar", orientation: "landscape", avatarName: undefined, createdAt: expect.any(Number) }]);
    expect(sanitizeLibrary(null)).toEqual({ twin: null, videos: [] });
  });
});
