import type { Metadata } from "next";

import { LegalPage } from "@/components/twin/legal-page";
import { TERMS, TERMS_DATES, TERMS_INTRO } from "@/lib/twin/terms";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that govern your use of Memorare Twin.",
};

export default function TermsPage() {
  return <LegalPage title="Terms & Conditions" dates={TERMS_DATES} intro={TERMS_INTRO} sections={TERMS} />;
}
