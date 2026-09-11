// Where the ElevenLabs key comes from, in order: the server environment, then
// the tenant's integration credential named "elevenlabs" (the same store the
// HeyGen key lives in, and what ibl.ai's own ElevenLabs proxy reads).
import config from "@/lib/iblai/config";
import { extractApiKey, isUsableKey } from "@/lib/heygen/credential";

const TTL_MS = 60_000;
const cache = new Map<string, { key: string; expiresAt: number }>();

export class ElevenLabsCredentialError extends Error {
  constructor(public reason: "missing" | "lookup") {
    super(`elevenlabs_credential_${reason}`);
    this.name = "ElevenLabsCredentialError";
  }
}

export async function resolveElevenLabsKey(tenant: string, dmToken: string): Promise<string> {
  const fromEnv = process.env.ELEVENLABS_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  const cacheKey = `${tenant}:${dmToken}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.key;

  const res = await fetch(`${config.dmUrl()}/api/ai-account/orgs/${tenant}/integration-credential/?name=elevenlabs`, {
    headers: { Authorization: `Token ${dmToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) throw new ElevenLabsCredentialError("missing");
  if (!res.ok) throw new ElevenLabsCredentialError("lookup");
  const key = extractApiKey(await res.json());
  if (!key || !isUsableKey(key)) throw new ElevenLabsCredentialError("missing");
  cache.set(cacheKey, { key, expiresAt: Date.now() + TTL_MS });
  return key;
}
