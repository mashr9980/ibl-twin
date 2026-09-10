// The caller's own library: their twin and the videos they made, held in
// their platform metadata. Identity comes from the platform session token,
// so one member never sees another's.
import { NextResponse } from "next/server";

import { getLibrary, PlatformUnavailableError, saveLibrary } from "@/lib/library-store";
import { callerFromRequest } from "@/lib/paywall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "Cache-Control": "no-store" } };

function failed(err: unknown) {
  const status = err instanceof PlatformUnavailableError ? 502 : 500;
  return NextResponse.json({ error: "library_unavailable" }, { status });
}

export async function GET(req: Request) {
  const caller = await callerFromRequest(req);
  if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getLibrary(caller.token, caller.user.username), NO_STORE);
  } catch (err) {
    return failed(err);
  }
}

export async function PUT(req: Request) {
  const caller = await callerFromRequest(req);
  if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  try {
    return NextResponse.json(await saveLibrary(caller.token, body), NO_STORE);
  } catch (err) {
    return failed(err);
  }
}
