import { NextResponse } from "next/server";
import config from "@/lib/iblai/config";
import { freeVideosPerMonth } from "@/lib/entitlement";
import {
  PaywallUpstreamError,
  paywallSlug,
  platformCredentialProblem,
  resolveCatalogue,
} from "@/lib/paywall";

export const dynamic = "force-dynamic";

/** Public: what the app sells and whether the server can sell it. */
export async function GET() {
  try {
    const catalogue = await resolveCatalogue();
    return NextResponse.json(
      {
        app: paywallSlug(),
        appName: config.appName(),
        serverReady: !platformCredentialProblem(),
        freeVideos: freeVideosPerMonth(),
        ...catalogue,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    if (e instanceof PaywallUpstreamError) return NextResponse.json(e.body, { status: e.status });
    throw e;
  }
}
