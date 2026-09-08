import "./helpers/browser-stub";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createVideo,
  HeygenBusyError,
  HeygenCreditsExhaustedError,
  HeygenPhotoRejectedError,
  HeygenTimeoutError,
  heygenErrorMessage,
  waitForLook,
} from "@/lib/heygen/rest";

const calls: { url: string; init: RequestInit }[] = [];
let lookAnswers: unknown[] = [];

beforeEach(() => {
  calls.length = 0;
  lookAnswers = [];
  localStorage.setItem("dm_token", "t");
  localStorage.setItem("app_tenant", "tenant1");
  (globalThis as any).dispatchEvent = () => true;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (url.includes("/avatars")) {
      const next = lookAnswers.shift();
      if (next instanceof Response) return next;
      return new Response(JSON.stringify({ data: { avatar_list: next ? [next] : [] } }), { status: 200 });
    }
    return new Response(JSON.stringify({ data: { video_id: "vid1" } }), { status: 200 });
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

  it("reports a HeyGen outage as busy", async () => {
    vi.stubGlobal("fetch", async () => new Response("upstream down", { status: 503 }));
    await expect(createVideo({ ...base, avatar_id: "a1" })).rejects.toBeInstanceOf(HeygenBusyError);
  });
});

describe("waitForLook", () => {
  it("rides out a transient poll failure and returns the finished look", async () => {
    lookAnswers = [new Response("oops", { status: 502 }), { id: "l1", group_id: "g1", status: "pending" }, { id: "l1", group_id: "g1", status: "completed" }];
    const look = await waitForLook("g1", { intervalMs: 1 });
    expect(look.id).toBe("l1");
    expect(calls.length).toBe(3);
  });

  it("rejects a picture HeyGen could not use", async () => {
    lookAnswers = [{ id: "l1", group_id: "g1", status: "failed" }];
    await expect(waitForLook("g1", { intervalMs: 1 })).rejects.toBeInstanceOf(HeygenPhotoRejectedError);
  });

  it("gives up after the deadline", async () => {
    lookAnswers = Array.from({ length: 50 }, () => ({ id: "l1", group_id: "g1", status: "pending" }));
    await expect(waitForLook("g1", { intervalMs: 1, timeoutMs: 5 })).rejects.toBeInstanceOf(HeygenTimeoutError);
  });
});

describe("heygenErrorMessage", () => {
  it("turns each known failure into a plain sentence", () => {
    expect(heygenErrorMessage(new HeygenBusyError(), "x")).toMatch(/busy/);
    expect(heygenErrorMessage(new HeygenTimeoutError(), "x")).toMatch(/longer than usual/);
    expect(heygenErrorMessage(new HeygenPhotoRejectedError(), "x")).toMatch(/picture/);
    expect(heygenErrorMessage(new HeygenCreditsExhaustedError(), "x")).toMatch(/credits/);
    expect(heygenErrorMessage(new Error("413 payload"), "x")).toMatch(/too large/);
    expect(heygenErrorMessage(new Error("weird"), "fallback")).toBe("fallback");
  });
});
