import { describe, it, expect } from "vitest";
import { isAvatarCatalogue, trimAvatarCatalogue } from "@/lib/heygen/catalogue";

const raw = {
  error: null,
  data: {
    avatars: [
      { avatar_id: "a1", avatar_name: "Abigail (Upper Body)", gender: "female", preview_image_url: "https://x/a1.png",
        preview_video_url: "https://x/a1.mp4", premium: false, tags: ["office", "front"], default_voice_id: "v1", extra: { big: "x".repeat(500) } },
      { avatar_id: "", avatar_name: "broken" },
    ],
    talking_photos: [{ talking_photo_id: "t1", talking_photo_name: "Me", preview_image_url: "https://x/t1.png", tags: [] }],
  },
};

describe("trimAvatarCatalogue", () => {
  it("keeps only the fields the gallery reads and drops malformed rows", () => {
    const out = trimAvatarCatalogue(raw) as typeof raw;
    expect(out.data.avatars).toEqual([
      { avatar_id: "a1", avatar_name: "Abigail (Upper Body)", gender: "female", preview_image_url: "https://x/a1.png",
        preview_video_url: "https://x/a1.mp4", premium: false },
    ]);
    expect(out.data.talking_photos).toEqual([{ talking_photo_id: "t1", talking_photo_name: "Me", preview_image_url: "https://x/t1.png" }]);
    expect(out.error).toBeNull();
  });
  it("shrinks the payload substantially", () => {
    const before = JSON.stringify(raw).length, after = JSON.stringify(trimAvatarCatalogue(raw)).length;
    expect(after).toBeLessThan(before / 2);
  });
  it("passes anything that isn't a catalogue envelope through untouched", () => {
    expect(trimAvatarCatalogue({ error: "nope" })).toEqual({ error: "nope" });
    expect(trimAvatarCatalogue(null)).toBeNull();
  });
  it("matches only GET v2/avatars", () => {
    expect(isAvatarCatalogue("GET", "v2/avatars")).toBe(true);
    expect(isAvatarCatalogue("GET", "/v2/avatars/")).toBe(true);
    expect(isAvatarCatalogue("POST", "v2/avatars")).toBe(false);
    expect(isAvatarCatalogue("GET", "v2/voices")).toBe(false);
    expect(isAvatarCatalogue("GET", "v2/avatars/abc")).toBe(false);
  });
});
