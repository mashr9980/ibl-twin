// Whether this workspace can clone voices right now: a key, a plan that
// allows instant cloning, a free voice slot, and characters left for speech.
import { NextResponse, type NextRequest } from "next/server";

import { ElevenLabsCredentialError, resolveElevenLabsKey } from "@/lib/elevenlabs/credential";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Subscription = {
  can_use_instant_voice_cloning?: boolean;
  voice_limit?: number;
  voice_slots_used?: number;
  character_count?: number;
  character_limit?: number;
};

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const dmToken = auth.startsWith("Token ") ? auth.slice(6).trim() : "";
  const tenant = req.headers.get("x-platform")?.trim() ?? "";
  if (!dmToken || !tenant) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let apiKey: string;
  try {
    apiKey = await resolveElevenLabsKey(tenant, dmToken);
  } catch (err) {
    const missing = err instanceof ElevenLabsCredentialError && err.reason === "missing";
    return NextResponse.json({ ok: false, reason: missing ? "no_key" : "lookup_failed" }, { headers: { "Cache-Control": "no-store" } });
  }

  const res = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": apiKey }, cache: "no-store" });
  if (!res.ok) return NextResponse.json({ ok: false, reason: res.status === 401 ? "bad_key" : "unavailable" }, { headers: { "Cache-Control": "no-store" } });
  const sub = (await res.json()) as Subscription;
  const slots = { used: sub.voice_slots_used ?? 0, limit: sub.voice_limit ?? 0 };
  const characters = { used: sub.character_count ?? 0, limit: sub.character_limit ?? 0 };
  return NextResponse.json(
    {
      ok: true,
      canClone: sub.can_use_instant_voice_cloning === true,
      slotsFree: slots.limit === 0 || slots.used < slots.limit,
      charactersLeft: Math.max(0, characters.limit - characters.used),
      slots,
      characters,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
