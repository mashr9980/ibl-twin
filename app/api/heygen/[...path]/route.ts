/**
 * HeyGen REST proxy (server).
 *
 * The browser never sees a HeyGen API key. Instead:
 *   1. Client calls `/api/heygen/<path>` with its ibl.ai DM token in
 *      `Authorization: Token <dm_token>` and the tenant in `X-Platform`.
 *   2. This handler trades that token for the tenant's HeyGen credential:
 *        GET {dmUrl}/api/ai-account/orgs/{tenant}/integration-credential/?name=heygen
 *   3. The resolved key goes upstream as `X-Api-Key`; the response is
 *      streamed straight back.
 *
 * Credentials are cached per {tenant, token} for a short TTL so a page of
 * avatar thumbnails doesn't trigger a lookup per tile.
 */
import { NextRequest, NextResponse } from "next/server";
import config from "@/lib/iblai/config";
import { extractApiKey } from "@/lib/heygen/credential";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEYGEN_API_BASE = "https://api.heygen.com";
/** Asset uploads do NOT go to api.heygen.com. */
const HEYGEN_UPLOAD_BASE = "https://upload.heygen.com";
const CREDENTIAL_TTL_MS = 60_000;

const credentialCache = new Map<string, { apiKey: string; expiresAt: number }>();

function upstreamBaseFor(path: string[]): string {
  return path[0] === "v1" && path[1] === "asset" ? HEYGEN_UPLOAD_BASE : HEYGEN_API_BASE;
}

async function resolveHeygenKey(tenant: string, dmToken: string): Promise<string> {
  const cacheKey = `${tenant}:${dmToken}`;
  const hit = credentialCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.apiKey;

  const url =
    `${config.dmUrl()}/api/ai-account/orgs/${encodeURIComponent(tenant)}` +
    `/integration-credential/?name=heygen`;
  const res = await fetch(url, {
    headers: { Authorization: `Token ${dmToken}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`integration-credential ${res.status}`);
  }
  const apiKey = extractApiKey(await res.json());
  if (!apiKey) throw new Error("no_heygen_credential");

  credentialCache.set(cacheKey, { apiKey, expiresAt: Date.now() + CREDENTIAL_TTL_MS });
  return apiKey;
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;

  const auth = req.headers.get("authorization") ?? "";
  const dmToken = auth.startsWith("Token ") ? auth.slice(6).trim() : "";
  const tenant = req.headers.get("x-platform")?.trim() ?? "";
  if (!dmToken || !tenant) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let apiKey: string;
  try {
    apiKey = await resolveHeygenKey(tenant, dmToken);
  } catch (err) {
    const missing = err instanceof Error && err.message === "no_heygen_credential";
    console.error("[api/heygen] credential lookup failed:", err);
    // 424 mirrors iblai/video: the tenant simply has no HeyGen key yet.
    return NextResponse.json(
      { error: missing ? "heygen_credential_missing" : "credential_lookup_failed" },
      { status: missing ? 424 : 502 },
    );
  }

  const target = new URL(`${upstreamBaseFor(path)}/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  const headers: Record<string, string> = {
    "X-Api-Key": apiKey,
    Accept: req.headers.get("accept") ?? "application/json",
  };
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const method = req.method.toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await req.arrayBuffer();

  const upstream = await fetch(target.toString(), { method, headers, body, cache: "no-store" });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
