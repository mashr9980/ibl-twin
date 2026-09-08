"use client";

// Shown at the top of the app while the workspace's HeyGen balance is too
// low to generate anything, so nobody wonders why uploads fail.

import { Alert } from "@/components/twin/alert";
import { useHeygenCredits } from "@/hooks/use-heygen-credential";

export function CreditsBanner({ isAdmin }: { isAdmin: boolean }) {
  const credits = useHeygenCredits();
  if (!credits?.low) return null;
  return (
    <div className="px-4 pt-4 sm:px-6">
      <Alert>
        Video generation is paused: this workspace&apos;s HeyGen credits are used up
        {credits.remaining > 0 ? ` (${credits.remaining} left)` : ""}.{" "}
        {isAdmin ? (
          <>
            <a
              href="https://app.heygen.com/settings/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4"
            >
              Add credits in HeyGen
            </a>{" "}
            and uploads work again.
          </>
        ) : (
          "Ask the workspace owner to add credits."
        )}
      </Alert>
    </div>
  );
}
