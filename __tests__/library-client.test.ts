import "./helpers/browser-stub";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getTwin, loadLibrary, rememberVideo, resetLibraryCache } from "@/lib/twin/local-library";

type Call = { url: string; method: string; body?: unknown; token: string };
const calls: Call[] = [];
let server: Record<string, unknown> = { twin: null, videos: [] };

beforeEach(() => {
  calls.length = 0;
  resetLibraryCache();
  localStorage.clear();
  localStorage.setItem("dm_token", "tok-a");
  localStorage.setItem("app_tenant", "tenant1");
  server = { twin: null, videos: [] };
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? "GET";
    const token = String((init.headers as Record<string, string>).Authorization).replace("Token ", "");
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ url, method, body, token });
    if (method === "PUT") server = body;
    return new Response(JSON.stringify(server), { status: 200 });
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("member library", () => {
  it("loads once per session and serves the cache afterwards", async () => {
    await loadLibrary();
    await loadLibrary();
    expect(calls.filter((c) => c.method === "GET")).toHaveLength(1);
  });

  it("writes through: the next read sees the video before the server round-trip matters", async () => {
    await rememberVideo({ id: "v1", title: "T", kind: "twin", orientation: "landscape", createdAt: 1 });
    expect((await loadLibrary()).videos.map((v) => v.id)).toEqual(["v1"]);
    expect(calls.at(-1)).toMatchObject({ method: "PUT", token: "tok-a" });
  });

  it("switching account on the same browser starts from that account's library", async () => {
    await rememberVideo({ id: "v1", title: "T", kind: "twin", orientation: "landscape", createdAt: 1 });
    localStorage.setItem("dm_token", "tok-b");
    server = { twin: null, videos: [] };
    expect((await loadLibrary()).videos).toEqual([]);
    expect(calls.at(-1)).toMatchObject({ method: "GET", token: "tok-b" });
  });

  it("adopts records an older version left in localStorage, once", async () => {
    localStorage.setItem("twin.self:tenant1", JSON.stringify({ groupId: "g1", name: "My Twin", createdAt: 1 }));
    localStorage.setItem("twin.videos:tenant1", JSON.stringify([{ id: "old", title: "Old", kind: "avatar", orientation: "landscape", createdAt: 1 }]));
    expect((await getTwin())?.groupId).toBe("g1");
    expect(calls.some((c) => c.method === "PUT" && (c.body as { videos: { id: string }[] }).videos[0].id === "old")).toBe(true);
    expect(localStorage.getItem("twin.self:tenant1")).toBeNull();
  });
});
