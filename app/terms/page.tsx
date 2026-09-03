import { LegalPage } from "@/lib/twin/legal";

export const metadata = { title: "terms & conditions | memorare twin" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms &amp; Conditions" updated="3 September 2026">
      <h2>Scope</h2>
      <p>These terms cover this demonstration deployment of Memorare Twin. It is provided as-is, without warranty, for evaluation. It is not a commercial service and no availability is guaranteed.</p>

      <h2>Your account</h2>
      <p>Access requires an ibl.ai account and membership of the tenant this deployment is configured for. Your use of the underlying platform remains governed by ibl.ai&apos;s own terms.</p>

      <h2>What you may upload</h2>
      <ul>
        <li>Only images and video you own or have permission to use.</li>
        <li>Only likenesses you are entitled to reproduce. Do not create a twin of another person without their consent.</li>
        <li>Nothing unlawful, deceptive, or intended to impersonate someone in a way that could mislead.</li>
      </ul>

      <h2>Generated content</h2>
      <p>Rights in generated video follow the terms of the video provider configured on the tenant and the plan attached to it. Confirm both before any commercial use. Synthetic video should be presented honestly and not passed off as an unaltered recording of a real person.</p>

      <h2>Credits</h2>
      <p>Generation consumes credits from the plan on your tenant. Failed renders are not charged. Credit balances and renewal are managed by ibl.ai, not by this application.</p>

      <h2>Limitation of liability</h2>
      <p>This deployment is provided without warranties of any kind. To the extent permitted by law, no liability is accepted for loss arising from its use, including loss of generated content or interruption of service.</p>

      <h2>Changes</h2>
      <p>These terms may change as the deployment changes. The date above reflects the current version.</p>
    </LegalPage>
  );
}
