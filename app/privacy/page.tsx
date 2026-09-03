import { LegalPage } from "@/lib/twin/legal";

export const metadata = { title: "privacy policy | memorare twin" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="3 September 2026">
      <h2>What this application is</h2>
      <p>Memorare Twin is an AI video studio running on the ibl.ai platform. This deployment is a demonstration build operating against a single ibl.ai tenant. It is not a commercial service.</p>

      <h2>Who you sign in as</h2>
      <p>Authentication is handled entirely by ibl.ai&apos;s single sign-on. This application never sees or stores your password. After sign-in it holds the session tokens ibl.ai issues, in your own browser, and sends them with each request so the platform can identify you.</p>

      <h2>What we store</h2>
      <ul>
        <li>Session tokens and your basic profile, in your browser&apos;s local storage.</li>
        <li>Labels for the videos you generate — whether each one is a twin, an avatar video or a clip — also in your browser, so the filters work.</li>
      </ul>
      <p>This application keeps no database of its own. Everything else lives with ibl.ai and the video provider configured on the tenant.</p>

      <h2>What you upload</h2>
      <p>Photos, videos and reference images are sent to the video provider registered on your tenant, where the avatar is trained and the video rendered. They are handled under that provider&apos;s terms and the plan attached to your tenant.</p>

      <h2>Credentials</h2>
      <p>The video provider&apos;s API key is stored as an integration credential on the ibl.ai tenant. It is resolved server-side for each request and is never sent to the browser or included in any page or script this application serves.</p>

      <h2>Deleting your data</h2>
      <p>You can delete your twin from Create Twin and any video from My Videos. Signing out clears the session and the local labels from your browser.</p>

      <h2>Contact</h2>
      <p>Questions about the underlying platform go to ibl.ai support.</p>
    </LegalPage>
  );
}
