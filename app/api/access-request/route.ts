import { promises as fs } from "node:fs";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import config from "@/lib/iblai/config";
import { invitePlatformMember } from "@/lib/iblai/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Access requests have no ibl.ai parallel: the platform can tell us a user is
 * not a member, but there is nowhere to record that they asked to become one.
 * Stored here until ibl.ai exposes an equivalent endpoint.
 */
export type AccessRequest = {
  email: string;
  tenant: string;
  reason: string;
  requestedAt: string;
  outcome: string;
};

const FILE =
  process.env.ACCESS_REQUESTS_FILE ??
  path.join(process.cwd(), ".data", "access-requests.json");

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECORDS = 500;

let queue: Promise<unknown> = Promise.resolve();

function serialize<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}

async function readAll(): Promise<AccessRequest[]> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const { email, tenant, reason } = (body ?? {}) as Record<string, unknown>;
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanTenant = typeof tenant === "string" ? tenant.trim() : "";

  if (!EMAIL.test(cleanEmail) || cleanEmail.length > 254) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  if (!cleanTenant) {
    return NextResponse.json({ ok: false, error: "invalid_tenant" }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const invite = await invitePlatformMember(
    config.dmUrl(),
    cleanTenant,
    cleanEmail,
    origin,
  );
  if (invite.status === "failed") {
    console.error("[access-request] invite failed:", invite.reason);
  }

  const record: AccessRequest = {
    email: cleanEmail,
    tenant: cleanTenant,
    reason: typeof reason === "string" ? reason.slice(0, 300) : "",
    requestedAt: new Date().toISOString(),
    outcome: invite.status,
  };

  try {
    await serialize(async () => {
      const all = await readAll();
      const existing = all.findIndex(
        (r) => r.email === record.email && r.tenant === record.tenant,
      );
      if (existing >= 0) all[existing] = record;
      else all.push(record);

      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(all.slice(-MAX_RECORDS), null, 2), "utf8");
    });
  } catch (err) {
    console.error("[access-request] write failed:", err);
    return NextResponse.json({ ok: false, error: "storage_unavailable" }, { status: 503 });
  }

  const invited = invite.status === "invited" || invite.status === "already_invited";
  return NextResponse.json(
    { ok: true, invited },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(req: NextRequest) {
  const secret = process.env.ACCESS_REQUESTS_TOKEN?.trim();
  const auth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!secret || auth !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { ok: true, requests: await readAll() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
