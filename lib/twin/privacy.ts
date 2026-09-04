/**
 * Twin's Privacy Policy, lifted verbatim from twin.memorare.ai/privacy:
 * sixteen numbered sections. Kept as data so the page stays markup only.
 */

export type Block =
  | { t: "p"; v: string }
  | { t: "h3"; v: string }
  | { t: "ul"; v: string[] };

export interface LegalSection {
  title: string;
  blocks: Block[];
}

export const PRIVACY_DATES = ["Effective as of May 29, 2026", "Last Updated: May 29, 2026"] as const;

export const PRIVACY_INTRO = ["Welcome to Memorare Twin. This Privacy Policy explains how we collect, use, store, share, and protect information when you use our website, platform, applications, tools, and related services.", "By using Memorare Twin, you agree to the practices described in this Privacy Policy."] as const;

export const PRIVACY: LegalSection[] = [
  {
    title: "1. Who We Are",
    blocks: [
      { t: "p", v: "Memorare Twin is an AI-powered video creation platform that helps users create avatar videos, scripts, voiceovers, presentations, training content, marketing videos, educational videos, and related digital media." },
      { t: "p", v: "For the purposes of this Privacy Policy, “Memorare Twin,” “we,” “our,” and “us” refer to ibl.ai, the operator of the Memorare Twin platform." },
    ],
  },
  {
    title: "2. Information We Collect",
    blocks: [
      { t: "p", v: "We may collect the following types of information:" },
      { t: "h3", v: "Account Information" },
      { t: "p", v: "When you create an account or use our platform, we may collect:" },
      { t: "ul", v: [
        "Name",
        "Email address",
        "Company or organization name",
        "Login credentials",
        "Account preferences",
        "Subscription or plan information",
      ] },
      { t: "h3", v: "User Content" },
      { t: "p", v: "When you use Memorare Twin, you may upload, create, or generate content, including:" },
      { t: "ul", v: [
        "Scripts",
        "Images",
        "Videos",
        "Audio files",
        "Voice samples",
        "Avatar images",
        "Custom avatar materials",
        "Branding assets",
        "Generated video projects",
        "Project names and descriptions",
      ] },
      { t: "h3", v: "Payment Information" },
      { t: "p", v: "If you purchase a subscription, credits, tokens, or services, payment information may be processed by third-party payment providers. We may receive limited billing details such as:" },
      { t: "ul", v: [
        "Billing name",
        "Billing email",
        "Payment status",
        "Transaction ID",
        "Subscription status",
        "Purchase history",
      ] },
      { t: "p", v: "We do not store full credit card numbers unless explicitly stated through a secure payment provider." },
      { t: "h3", v: "Usage Information" },
      { t: "p", v: "We may collect information about how you use the platform, such as:" },
      { t: "ul", v: [
        "Pages visited",
        "Features used",
        "Videos generated",
        "Upload activity",
        "Device type",
        "Browser type",
        "IP address",
        "Date and time of use",
        "Error logs",
        "Performance data",
        "Referring website or source",
      ] },
      { t: "h3", v: "Cookies and Tracking Technologies" },
      { t: "p", v: "We may use cookies, pixels, analytics tools, and similar technologies to:" },
      { t: "ul", v: [
        "Keep you logged in",
        "Remember preferences",
        "Improve platform performance",
        "Understand user activity",
        "Measure marketing effectiveness",
        "Improve security",
      ] },
      { t: "p", v: "You can control cookies through your browser settings. Some features may not work properly if cookies are disabled." },
    ],
  },
  {
    title: "3. How We Use Your Information",
    blocks: [
      { t: "p", v: "We may use your information to:" },
      { t: "ul", v: [
        "Provide and operate the Memorare Twin platform",
        "Create and process AI avatar videos",
        "Generate scripts, voiceovers, and video content",
        "Manage user accounts",
        "Process payments and subscriptions",
        "Provide customer support",
        "Improve platform functionality",
        "Personalize the user experience",
        "Monitor usage and performance",
        "Detect bugs, errors, abuse, or security issues",
        "Send service updates and important account notices",
        "Send marketing communications, if permitted",
        "Enforce our Terms & Conditions",
        "Comply with legal obligations",
      ] },
    ],
  },
  {
    title: "4. AI Processing and Generated Content",
    blocks: [
      { t: "p", v: "Memorare Twin uses artificial intelligence and third-party technology providers to help generate, process, or enhance content." },
      { t: "p", v: "When you upload or submit content, that content may be processed by AI systems or service providers in order to:" },
      { t: "ul", v: [
        "Generate avatar videos",
        "Convert scripts into speech",
        "Create or process voices",
        "Generate visuals",
        "Improve lip-sync",
        "Render videos",
        "Store and deliver generated media",
        "Improve system reliability and performance",
      ] },
      { t: "p", v: "You are responsible for ensuring that you have the necessary rights, licenses, and permissions to upload and use any content, including images, videos, voices, names, likenesses, logos, trademarks, or copyrighted materials." },
    ],
  },
  {
    title: "5. Consent for Faces, Voices, and Likeness",
    blocks: [
      { t: "p", v: "You may only upload or create content using a real person’s face, voice, image, or likeness if you have the legal right and clear permission to do so." },
      { t: "p", v: "You agree not to use Memorare Twin to impersonate another person, mislead viewers, create unauthorized digital replicas, or generate deceptive content involving someone’s identity, voice, or appearance." },
    ],
  },
  {
    title: "6. How We Share Information",
    blocks: [
      { t: "p", v: "We do not sell your personal information." },
      { t: "p", v: "We may share information with trusted third parties when necessary to operate the platform, including:" },
      { t: "ul", v: [
        "Cloud hosting providers",
        "AI processing providers",
        "Payment processors",
        "Analytics providers",
        "Email and communication providers",
        "Customer support tools",
        "Security and fraud prevention providers",
        "Legal or compliance advisors",
      ] },
      { t: "p", v: "We may also share information if required by law, legal process, court order, government request, or to protect the rights, safety, and security of Memorare Twin, our users, or others." },
    ],
  },
  {
    title: "7. Third-Party Services",
    blocks: [
      { t: "p", v: "Memorare Twin may integrate with third-party services, APIs, payment platforms, AI providers, cloud storage providers, or communication tools." },
      { t: "p", v: "Your use of third-party services may be subject to their own terms and privacy policies. We are not responsible for the privacy practices of third-party websites, platforms, or services." },
    ],
  },
  {
    title: "8. Data Retention",
    blocks: [
      { t: "p", v: "We retain information for as long as necessary to:" },
      { t: "ul", v: [
        "Provide the platform",
        "Maintain your account",
        "Complete transactions",
        "Store your projects",
        "Resolve disputes",
        "Enforce agreements",
        "Comply with legal obligations",
        "Improve security and platform reliability",
      ] },
      { t: "p", v: "You may request deletion of your account or certain personal information by contacting us. Some information may be retained if required for legal, security, billing, backup, or legitimate business purposes." },
    ],
  },
  {
    title: "9. Data Security",
    blocks: [
      { t: "p", v: "We use reasonable administrative, technical, and organizational measures to help protect information from unauthorized access, loss, misuse, alteration, or disclosure." },
      { t: "p", v: "However, no online platform, cloud system, AI service, or method of electronic storage is completely secure. We cannot guarantee absolute security." },
      { t: "p", v: "You are responsible for keeping your login credentials confidential and for all activity that occurs under your account." },
    ],
  },
  {
    title: "10. Your Choices and Rights",
    blocks: [
      { t: "p", v: "Depending on your location, you may have rights related to your personal information, including the right to:" },
      { t: "ul", v: [
        "Access your personal information",
        "Correct inaccurate information",
        "Request deletion of certain information",
        "Object to certain processing",
        "Request a copy of your data",
        "Opt out of marketing emails",
        "Limit certain uses of your information",
      ] },
      { t: "p", v: "To make a privacy request, contact us at:" },
      { t: "p", v: "Email: support@iblai.zendesk.com" },
      { t: "p", v: "We may need to verify your identity before processing certain requests." },
    ],
  },
  {
    title: "11. Marketing Communications",
    blocks: [
      { t: "p", v: "If you subscribe to updates, create an account, or interact with our services, we may send you emails about product updates, features, offers, or educational content." },
      { t: "p", v: "You can unsubscribe from marketing emails at any time by clicking the unsubscribe link in the email or contacting us directly." },
      { t: "p", v: "We may still send you important transactional or service-related messages." },
    ],
  },
  {
    title: "12. Children’s Privacy",
    blocks: [
      { t: "p", v: "Memorare Twin is not intended for children under the age of 13." },
      { t: "p", v: "We do not knowingly collect personal information from children under 13. If we become aware that we have collected information from a child under 13 without appropriate consent, we will take reasonable steps to delete that information." },
      { t: "p", v: "If your organization uses Memorare Twin in an educational environment, you are responsible for ensuring that your use complies with applicable privacy, education, and child protection laws." },
    ],
  },
  {
    title: "13. International Users",
    blocks: [
      { t: "p", v: "If you access Memorare Twin from outside the United States, your information may be processed and stored in the United States or other countries where our service providers operate." },
      { t: "p", v: "By using Memorare Twin, you understand that your information may be transferred to locations that may have different data protection laws than your country of residence." },
    ],
  },
  {
    title: "14. Business Transfers",
    blocks: [
      { t: "p", v: "If Memorare Twin is involved in a merger, acquisition, financing, reorganization, sale of assets, or similar business transaction, your information may be transferred as part of that transaction." },
      { t: "p", v: "We will take reasonable steps to ensure that any transferred information remains subject to appropriate privacy protections." },
    ],
  },
  {
    title: "15. Changes to This Privacy Policy",
    blocks: [
      { t: "p", v: "We may update this Privacy Policy from time to time." },
      { t: "p", v: "When we make changes, we will update the “Last Updated” date at the top of this page. If changes are significant, we may provide additional notice through the platform, email, or website." },
      { t: "p", v: "Your continued use of Memorare Twin after changes are posted means you accept the updated Privacy Policy." },
    ],
  },
  {
    title: "16. Contact Us",
    blocks: [
      { t: "p", v: "If you have questions about this Privacy Policy or want to make a privacy request, contact us at:" },
      { t: "p", v: "Company: ibl.ai" },
      { t: "p", v: "Email: support@iblai.zendesk.com" },
      { t: "p", v: "Address: 600 3rd Ave, 2nd Floor, New York, NY 10016" },
      { t: "p", v: "Website: ibl.ai" },
    ],
  },
];
