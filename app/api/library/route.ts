// The caller's own library: their twin and the videos they made. Identity comes
// from the platform session token, so one member never sees another's.
import { NextResponse } from "next/server";

import { getLibrary, saveLibrary } from "@/lib/library-store";
import { userFromRequest } from "@/lib/paywall";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getLibrary(user.username), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad_request" }, { status: 400 });
  return NextResponse.json(await saveLibrary(user.username, body), { headers: { "Cache-Control": "no-store" } });
}
