import { describe, it, expect } from "vitest";
import { fallbackPermissions } from "@/lib/rbac/permissions";

const T = "d0d3b083f95446a59ed6e0a73396ab01";
// Mirrors web-utils' checkSingleResource so the test pins the contract we rely on.
const check = (perms: Record<string, Record<string, boolean>>, path: string) => {
  const [res, flag] = path.split("#");
  return !!perms[res]?.[flag];
};

describe("rbac fallback", () => {
  it("admins keep notification + user tools when the check fails", () => {
    const p = fallbackPermissions(T, true);
    expect(check(p, `/platforms/${T}/#can_send_notifications`)).toBe(true);
    expect(check(p, `/platforms/${T}/#can_manage_users`)).toBe(true);
  });
  it("members stay closed when the check fails", () => {
    const p = fallbackPermissions(T, false);
    expect(check(p, `/platforms/${T}/#can_send_notifications`)).toBe(false);
    expect(check(p, `/platforms/${T}/#can_manage_users`)).toBe(false);
  });
  it("an empty map fails closed (no flash of admin UI before hydration)", () => {
    expect(check({}, `/platforms/${T}/#can_send_notifications`)).toBe(false);
  });
});
