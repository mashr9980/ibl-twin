// Browser → this route → api.elevenlabs.io. The member's platform session is
// checked, the workspace's ElevenLabs key is added server-side, and only the
// calls the voice feature needs go through. The key is shared by the whole
// workspace, so every clone is labelled with the member who made it and a
// member can only list, hear and delete their own.
import { NextResponse, type NextRequest } from "next/server";

import { ElevenLabsCredentialError, resolveElevenLabsKey } from "@/lib/elevenlabs/credential";
import { isOwnedBy, ownerLabels } from "@/lib/elevenlabs/owner";
import { resolveUser } from "@/lib/paywall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPSTREAM = "https://api.elevenlabs.io";
const OWNER_TTL_MS = 5 * 60_000;
const owners = new Map<string, { owner: string | null; expiresAt: number }>();

type Voice = { voice_id: string; category?: string; labels?: Record<string, string> | null };

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const rel = path.join("/");
  const method = req.method.toUpperCase();

  const auth = req.headers.get("authorization") ?? "";
  const dmToken = auth.startsWith("Token ") ? auth.slice(6).trim() : "";
  const tenant = req.headers.get("x-platform")?.trim() ?? "";
  if (!dmToken || !tenant) return json({ error: "unauthorized" }, 401);
  const user = await resolveUser(dmToken);
  if (!user) return json({ error: "unauthorized" }, 401);

  let apiKey: string;
  try {
    apiKey = await resolveElevenLabsKey(tenant, dmToken);
  } catch (err) {
    const missing = err instanceof ElevenLabsCredentialError && err.reason === "missing";
    return json({ error: missing ? "elevenlabs_credential_missing" : "credential_lookup_failed" }, missing ? 424 : 502);
  }
  const upstream = (p: string, init: RequestInit = {}) =>
    fetch(`${UPSTREAM}/${p}`, { ...init, headers: { "xi-api-key": apiKey, ...(init.headers as Record<string, string>) }, cache: "no-store" });
  const pass = (res: Response) =>
    new NextResponse(res.body, { status: res.status, headers: { "Content-Type": res.headers.get("content-type") ?? "application/json", ...NO_STORE } });

  // The member's own clones.
  if (method === "GET" && rel === "v1/voices") {
    const res = await upstream("v1/voices");
    if (!res.ok) return pass(res);
    const body = (await res.json()) as { voices?: Voice[] };
    const voices = (body.voices ?? []).filter((v) => v.category === "cloned" && isOwnedBy(v, user.username));
    for (const v of voices) owners.set(v.voice_id, { owner: user.username, expiresAt: Date.now() + OWNER_TTL_MS });
    return json({ voices });
  }

  // A new clone, labelled with its owner whatever the browser sent.
  if (method === "POST" && rel === "v1/voices/add") {
    const sent = await req.formData().catch(() => null);
    if (!sent) return json({ error: "bad_request" }, 400);
    const form = new FormData();
    form.append("name", String(sent.get("name") ?? "").trim() || "My voice");
    for (const file of sent.getAll("files")) if (file instanceof Blob) form.append("files", file, file instanceof File ? file.name : "recording");
    form.append("remove_background_noise", "true");
    form.append("labels", JSON.stringify(ownerLabels(user.username)));
    const res = await upstream("v1/voices/add", { method: "POST", body: form });
    if (res.ok) {
      const created = (await res.clone().json().catch(() => null)) as { voice_id?: string } | null;
      if (created?.voice_id) owners.set(created.voice_id, { owner: user.username, expiresAt: Date.now() + OWNER_TTL_MS });
    }
    return pass(res);
  }

  // Deleting a clone or speaking with it: only its owner may.
  const own = rel.match(/^v1\/(voices|text-to-speech)\/([A-Za-z0-9]+)$/);
  if (own && ((own[1] === "voices" && method === "DELETE") || (own[1] === "text-to-speech" && method === "POST"))) {
    const voiceId = own[2];
    const cached = owners.get(voiceId);
    let owner = cached && cached.expiresAt > Date.now() ? cached.owner : undefined;
    if (owner === undefined) {
      const res = await upstream(`v1/voices/${voiceId}`);
      if (res.status === 404) return json({ error: "not_found" }, 404);
      if (!res.ok) return pass(res);
      const voice = (await res.json()) as Voice;
      owner = isOwnedBy(voice, user.username) ? user.username : null;
      owners.set(voiceId, { owner, expiresAt: Date.now() + OWNER_TTL_MS });
    }
    if (owner !== user.username) return json({ error: "not_found" }, 404);

    if (method === "DELETE") {
      const res = await upstream(`v1/voices/${voiceId}`, { method: "DELETE" });
      if (res.ok) owners.delete(voiceId);
      return pass(res);
    }
    const target = new URL(`${UPSTREAM}/${rel}`);
    req.nextUrl.searchParams.forEach((v, k) => target.searchParams.set(k, v));
    const res = await fetch(target, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", Accept: req.headers.get("accept") ?? "audio/mpeg" },
      body: await req.text(),
      cache: "no-store",
    });
    return pass(res);
  }

  return json({ error: "not_allowed" }, 404);
}

export { handle as GET, handle as POST, handle as DELETE };
