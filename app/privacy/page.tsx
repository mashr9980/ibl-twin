import type { Metadata } from "next";

import { LegalPage } from "@/components/twin/legal-page";
import { PRIVACY, PRIVACY_DATES, PRIVACY_INTRO } from "@/lib/twin/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Memorare Twin collects, uses, stores, shares, and protects your information.",
};

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" dates={PRIVACY_DATES} intro={PRIVACY_INTRO} sections={PRIVACY} />;
}
