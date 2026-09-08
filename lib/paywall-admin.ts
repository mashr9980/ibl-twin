// Server-only plumbing for the admin routes.
import { NextResponse } from "next/server";
import config from "./iblai/config";
import { PaywallUpstreamError, callerFromRequest, dmJson } from "./paywall";

export type AdminCaller = { token: string; username: string };

export async function adminCaller(req: Request): Promise<AdminCaller | NextResponse> {
  const caller = await callerFromRequest(req);
  if (!caller) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  return { token: caller.token, username: caller.user.username };
}

export const isResponse = (x: unknown): x is NextResponse => x instanceof NextResponse;

/** DM statuses pass through (403 not an admin, 400 no credential, 502 Stripe refused); anything else is a bug. */
export function failure(e: unknown): NextResponse {
  if (e instanceof PaywallUpstreamError) return NextResponse.json(e.body, { status: e.status });
  throw e;
}

export async function setSelfJoin(token: string, allow: boolean): Promise<void> {
  await dmJson(
    await fetch(`${config.dmUrl()}/api/core/users/platforms/config/`, {
      method: "POST",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ platform_key: config.mainTenantKey(), allow_self_linking: allow }),
      cache: "no-store",
    }),
  );
}

export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}
