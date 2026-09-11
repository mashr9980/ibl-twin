import "./helpers/browser-stub";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isOwnedBy, ownerLabels } from "@/lib/elevenlabs/owner";
import {
  asClonedVoiceId,
  clampSpeed,
  clonedVoiceId,
  cloneVoiceFromRecording,
  deleteClonedVoice,
  ElevenLabsCredentialMissingError,
  ElevenLabsRequestError,
  elevenLabsErrorMessage,
  listClonedVoices,
  speakWithVoice,
} from "@/lib/elevenlabs/rest";
import { createVideo, createVideoClip } from "@/lib/heygen/rest";

const calls: { url: string; init: RequestInit }[] = [];
let answer: () => Response = () => new Response(JSON.stringify({}), { status: 200 });

beforeEach(() => {
  calls.length = 0;
  localStorage.setItem("dm_token", "t");
  localStorage.setItem("app_tenant", "tenant1");
  (globalThis as any).dispatchEvent = () => true;
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return answer();
  });
});
afterEach(() => vi.unstubAllGlobals());

const refusal = (status: number, detail: unknown) => () => new Response(JSON.stringify({ detail }), { status });

describe("ElevenLabs client", () => {
  it("lists the member's clones through the app's own route with the platform session", async () => {
    answer = () => new Response(JSON.stringify({ voices: [{ voice_id: "v1", name: "Me", category: "cloned" }] }), { status: 200 });
    const voices = await listClonedVoices();
    expect(voices).toEqual([{ voice_id: "v1", name: "Me", category: "cloned" }]);
    expect(calls[0].url).toBe("/api/elevenlabs/v1/voices");
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Token t");
    expect(headers["X-Platform"]).toBe("tenant1");
  });

  it("clones from one recording as multipart name + files", async () => {
    answer = () => new Response(JSON.stringify({ voice_id: "new1" }), { status: 200 });
    const file = new File([new Uint8Array([1, 2, 3])], "me.wav", { type: "audio/wav" });
    const out = await cloneVoiceFromRecording({ name: "My voice", file });
    expect(out.voice_id).toBe("new1");
    expect(calls[0].url).toBe("/api/elevenlabs/v1/voices/add");
    expect(calls[0].init.method).toBe("POST");
    const body = calls[0].init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("name")).toBe("My voice");
    expect((body.get("files") as File).name).toBe("me.wav");
  });

  it("deletes a clone", async () => {
    answer = () => new Response(JSON.stringify({ status: "ok" }), { status: 200 });
    await deleteClonedVoice("v1");
    expect(calls[0].url).toBe("/api/elevenlabs/v1/voices/v1");
    expect(calls[0].init.method).toBe("DELETE");
  });

  it("speaks as MP3 with the multilingual model, clamping the slider's speed to ElevenLabs' range", async () => {
    answer = () => new Response(new Uint8Array([0xff, 0xfb]), { status: 200, headers: { "Content-Type": "audio/mpeg" } });
    const blob = await speakWithVoice("v1", "Hello there", 1.5);
    expect(blob.size).toBe(2);
    expect(calls[0].url).toBe("/api/elevenlabs/v1/text-to-speech/v1?output_format=mp3_44100_128");
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent).toEqual({ text: "Hello there", model_id: "eleven_multilingual_v2", voice_settings: { speed: 1.2 } });

    await speakWithVoice("v1", "Hello there");
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ text: "Hello there", model_id: "eleven_multilingual_v2" });
  });

  it("clamps speeds to 0.7–1.2", () => {
    expect(clampSpeed(0.5)).toBe(0.7);
    expect(clampSpeed(1.5)).toBe(1.2);
    expect(clampSpeed(0.9)).toBe(0.9);
  });

  it("marks cloned voice ids so they never collide with HeyGen's", () => {
    expect(asClonedVoiceId("abc")).toBe("el:abc");
    expect(clonedVoiceId("el:abc")).toBe("abc");
    expect(clonedVoiceId("1bd001e7e50f421d891986aad5158bc8")).toBeNull();
  });

  it("raises the credential error on 424 and keeps ElevenLabs' reason otherwise", async () => {
    answer = () => new Response(JSON.stringify({ error: "elevenlabs_credential_missing" }), { status: 424 });
    await expect(listClonedVoices()).rejects.toBeInstanceOf(ElevenLabsCredentialMissingError);

    answer = refusal(400, { status: "can_not_use_instant_voice_cloning", message: "Not on this plan." });
    const err = await listClonedVoices().catch((e) => e);
    expect(err).toBeInstanceOf(ElevenLabsRequestError);
    expect(err.code).toBe("can_not_use_instant_voice_cloning");
    expect(err.detail).toBe("Not on this plan.");

    answer = refusal(422, [{ msg: "field required" }]);
    const bad = await listClonedVoices().catch((e) => e);
    expect(bad.code).toBe("validation");
    expect(bad.detail).toBe("field required");
  });
});

describe("elevenLabsErrorMessage", () => {
  const fallback = "Couldn't clone your voice.";
  it("says what stops the member in plain words", () => {
    expect(elevenLabsErrorMessage(new ElevenLabsCredentialMissingError(), fallback)).toMatch(/isn't set up for this workspace/);
    expect(elevenLabsErrorMessage(new ElevenLabsRequestError(400, "can_not_use_instant_voice_cloning", ""), fallback)).toMatch(/plan doesn't include instant voice cloning/);
    expect(elevenLabsErrorMessage(new ElevenLabsRequestError(400, "voice_limit_reached", ""), fallback)).toMatch(/voice slots/);
    expect(elevenLabsErrorMessage(new ElevenLabsRequestError(401, "quota_exceeded", ""), fallback)).toMatch(/characters for this month/);
    expect(elevenLabsErrorMessage(new ElevenLabsRequestError(401, "invalid_api_key", ""), fallback)).toMatch(/key was refused/);
    expect(elevenLabsErrorMessage(new ElevenLabsRequestError(404, "voice_not_found", ""), fallback)).toMatch(/no longer available/);
    expect(elevenLabsErrorMessage(new ElevenLabsRequestError(429, "", ""), fallback)).toMatch(/busy right now/);
    expect(elevenLabsErrorMessage(new ElevenLabsRequestError(503, "", ""), fallback)).toMatch(/having trouble/);
    expect(elevenLabsErrorMessage(new ElevenLabsRequestError(400, "bad_audio", "Audio too short"), fallback)).toBe(
      "Couldn't clone your voice. ElevenLabs said: Audio too short.",
    );
    expect(elevenLabsErrorMessage(new Error("boom"), fallback)).toBe(fallback);
  });
});

describe("clone ownership", () => {
  it("labels a clone with the member and recognises only that member's", () => {
    const labels = ownerLabels("alice");
    expect(labels).toEqual({ app: "ibl-twin", owner: "alice" });
    expect(isOwnedBy({ labels }, "alice")).toBe(true);
    expect(isOwnedBy({ labels }, "bob")).toBe(false);
    expect(isOwnedBy({ labels: { owner: "alice" } }, "alice")).toBe(false);
    expect(isOwnedBy({ labels: null }, "alice")).toBe(false);
    expect(isOwnedBy({ labels }, "")).toBe(false);
  });
});

describe("HeyGen videos from a recording", () => {
  beforeEach(() => {
    answer = () => new Response(JSON.stringify({ data: { video_id: "vid1" } }), { status: 200 });
  });

  it("lip-syncs the twin to an uploaded recording instead of a HeyGen voice", async () => {
    await createVideo({ avatar_id: "look1", talking_photo: true, audio_asset_id: "aud1", title: "T", orientation: "portrait" });
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.video_inputs[0].voice).toEqual({ type: "audio", audio_asset_id: "aud1" });
    expect(sent.dimension).toEqual({ width: 720, height: 1280 });
  });

  it("still reads a script with a HeyGen voice when no recording is given", async () => {
    await createVideo({ avatar_id: "a1", voice_id: "v1", script: "Hi", title: "T", orientation: "landscape", speed: 1.2 });
    const sent = JSON.parse(String(calls[0].init.body));
    expect(sent.video_inputs[0].voice).toEqual({ type: "text", voice_id: "v1", input_text: "Hi", speed: 1.2 });
  });

  it("sends a clip either a recording or a script, never both", async () => {
    await createVideoClip({ asset_id: "img1", audio_asset_id: "aud1", aspect_ratio: "9:16", title: "T" });
    const withAudio = JSON.parse(String(calls[0].init.body));
    expect(withAudio).toEqual({
      type: "image",
      image: { type: "asset_id", asset_id: "img1" },
      audio_asset_id: "aud1",
      title: "T",
      aspect_ratio: "9:16",
      resolution: "1080p",
    });

    await createVideoClip({ asset_id: "img1", script: "Hi", voice_id: "v1", title: "T" });
    const withScript = JSON.parse(String(calls[1].init.body));
    expect(withScript.script).toBe("Hi");
    expect(withScript.voice_id).toBe("v1");
    expect(withScript.audio_asset_id).toBeUndefined();
  });
});
