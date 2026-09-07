/**
 * Server-side platform invitation.
 *
 * When a tenant has self-linking disabled, a non-member cannot add themselves
 * and the SDK's auto-join is refused. An invitation is the supported way in,
 * and it does not require opening the platform to everyone.
 */

export type InviteOutcome =
  | { status: "invited" }
  | { status: "already_invited" }
  | { status: "not_configured" }
  | { status: "failed"; reason: string };

function adminToken(): string {
  return process.env.IBLAI_ADMIN_TOKEN?.trim() ?? "";
}

export function inviteConfigured(): boolean {
  return !!adminToken();
}

export async function invitePlatformMember(
  dmUrl: string,
  tenant: string,
  email: string,
  redirectTo: string,
): Promise<InviteOutcome> {
  const token = adminToken();
  if (!token) return { status: "not_configured" };

  const base = dmUrl.replace(/\/$/, "");
  const query = new URLSearchParams({
    org: tenant,
    platform_key: tenant,
    email,
  });
  const headers = {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
  };

  try {
    const existing = await fetch(
      `${base}/api/catalog/invitations/platform/?${query.toString()}`,
      { headers },
    );
    if (existing.ok) {
      const data = await existing.json();
      const match = (data?.results ?? []).find(
        (r: { email?: string }) => r?.email?.toLowerCase() === email,
      );
      if (match) return { status: "already_invited" };
    }

    const res = await fetch(
      `${base}/api/catalog/invitations/platform/?${query.toString()}`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          email,
          platform_key: tenant,
          org: tenant,
          redirect_to: redirectTo,
          active: true,
        }),
      },
    );

    if (!res.ok) {
      return { status: "failed", reason: `${res.status} ${(await res.text()).slice(0, 200)}` };
    }
    return { status: "invited" };
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : "unknown" };
  }
}
