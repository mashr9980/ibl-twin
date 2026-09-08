import "./helpers/browser-stub";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createVideo, getTwinTrainingStatus } from "@/lib/heygen/rest";

const calls: { url: string; init: RequestInit }[] = [];

beforeEach(() => {
  calls.length = 0;
  localStorage.setItem("dm_token", "t");
  localStorage.setItem("app_tenant", "tenant1");
  (globalThis as any).dispatchEvent = () => true;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const body = url.includes("train/status")
      ? { data: { status: "ready" } }
      : { data: { video_id: "vid1" } };
    return new Response(JSON.stringify(body), { status: 200 });
  });
});
afterEach(() => vi.unstubAllGlobals());

const base = { voice_id: "v1", script: "Hi", title: "T", orientation: "landscape" as const };

describe("createVideo", () => {
  it("addresses a studio avatar by avatar_id", async () => {
    await createVideo({ ...base, avatar_id: "a1" });
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.video_inputs[0].character).toEqual({ type: "avatar", avatar_id: "a1", avatar_style: "normal" });
  });

  it("addresses the user's twin as a talking photo", async () => {
    const out = await createVideo({ ...base, avatar_id: "look1", talking_photo: true });
    expect(out.video_id).toBe("vid1");
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.video_inputs[0].character).toEqual({ type: "talking_photo", talking_photo_id: "look1" });
    expect(calls[0].url).toContain("/api/heygen/v2/video/generate");
  });
});

describe("getTwinTrainingStatus", () => {
  it("reads HeyGen's training state for the group", async () => {
    expect(await getTwinTrainingStatus("g1")).toBe("ready");
    expect(calls[0].url).toContain("/v2/photo_avatar/train/status/g1");
  });
});
