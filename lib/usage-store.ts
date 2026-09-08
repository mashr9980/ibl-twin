// Per-user monthly generation counts, kept in a JSON file on the server
// (USAGE_STORE_FILE, default .data/usage.json). Writes are serialised in
// process; this app runs as one Node process on its own machine.
import { promises as fs } from "node:fs";
import path from "node:path";

export type Usage = { used: number; period: string };

const file = () =>
  process.env.USAGE_STORE_FILE?.trim() || path.join(process.cwd(), ".data", "usage.json");

/** The current UTC month, the unit the free allowance resets on. */
export function currentPeriod(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** When the current period ends: the first instant of next month (UTC). */
export function periodEnd(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}

async function readAll(): Promise<Record<string, number>> {
  try {
    const parsed = JSON.parse(await fs.readFile(file(), "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const key = (username: string, period: string) => `${username}:${period}`;

export async function getUsage(username: string, period = currentPeriod()): Promise<Usage> {
  const all = await readAll();
  return { used: Number(all[key(username, period)] ?? 0), period };
}

/** Count one generation; returns the new total. */
export function incrementUsage(username: string, period = currentPeriod()): Promise<number> {
  return serialize(async () => {
    const all = await readAll();
    const next = Number(all[key(username, period)] ?? 0) + 1;
    all[key(username, period)] = next;
    await fs.mkdir(path.dirname(file()), { recursive: true });
    await fs.writeFile(file(), JSON.stringify(all, null, 2), "utf8");
    return next;
  });
}
