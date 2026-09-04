/**
 * Twin's Terms & Conditions, lifted verbatim from twin.memorare.ai/terms:
 * twenty-one numbered sections. Shares the block shape used by the
 * Privacy Policy so both render through the same component.
 */

import type { LegalSection } from "./privacy";

export const TERMS_DATES = ["Effective as of May 29, 2026", "Last Updated: May 29, 2026"] as const;

export const TERMS_INTRO = ["Welcome to Memorare Twin. These Terms & Conditions govern your access to and use of the Memorare Twin website, platform, applications, tools, content, and related services.", "By accessing or using Memorare Twin, you agree to these Terms & Conditions. If you do not agree, do not use the platform."] as const;

export const TERMS: LegalSection[] = [
  {
    title: "1. Overview of the Service",
    blocks: [
      { t: "p", v: "Memorare Twin is an AI-powered video creation platform that helps users create avatar videos, scripts, voiceovers, training videos, marketing videos, educational videos, presentations, and related digital content." },
      { t: "p", v: "The platform may include features such as:" },
      { t: "ul", v: [
        "AI avatar video generation",
        "Script creation or script assistance",
        "AI voice generation",
        "Custom avatar creation",
        "Pre-built avatar selection",
        "Media uploads",
        "Video rendering",
        "Project libraries",
        "Downloadable videos",
        "Credits, tokens, or subscription-based usage",
      ] },
      { t: "p", v: "Features may vary depending on your plan, location, account type, and platform availability." },
    ],
  },
  {
    title: "2. Eligibility",
    blocks: [
      { t: "p", v: "You must be at least 18 years old, or the age of legal majority in your jurisdiction, to use Memorare Twin." },
      { t: "p", v: "If you use Memorare Twin on behalf of a company, school, organization, or client, you represent that you have authority to accept these Terms on their behalf." },
    ],
  },
  {
    title: "3. User Accounts",
    blocks: [
      { t: "p", v: "To access certain features, you may need to create an account." },
      { t: "p", v: "You agree to:" },
      { t: "ul", v: [
        "Provide accurate account information",
        "Keep your login credentials secure",
        "Not share your account without authorization",
        "Notify us of unauthorized access",
        "Be responsible for all activity under your account",
      ] },
      { t: "p", v: "We reserve the right to suspend or terminate accounts that violate these Terms or create risk for the platform, other users, or third parties." },
    ],
  },
  {
    title: "4. User Content",
    blocks: [
      { t: "p", v: "“User Content” means any content you upload, submit, create, edit, or generate through Memorare Twin, including:" },
      { t: "ul", v: [
        "Scripts",
        "Images",
        "Videos",
        "Audio",
        "Voice samples",
        "Avatar materials",
        "Logos",
        "Brand assets",
        "Prompts",
        "Generated videos",
        "Project data",
      ] },
      { t: "p", v: "You retain ownership of your User Content, subject to the rights and licenses granted in these Terms." },
      { t: "p", v: "By uploading or submitting User Content, you grant Memorare Twin a limited license to host, process, reproduce, modify, render, display, transmit, and use your content only as needed to provide, operate, improve, secure, and support the platform." },
    ],
  },
  {
    title: "5. Responsibility for Content",
    blocks: [
      { t: "p", v: "You are solely responsible for the content you upload, create, generate, download, publish, or distribute using Memorare Twin." },
      { t: "p", v: "You represent and warrant that:" },
      { t: "ul", v: [
        "You own or have permission to use all uploaded content",
        "You have the right to use any face, voice, image, name, likeness, logo, trademark, or copyrighted material",
        "Your content does not violate any law or third-party rights",
        "Your content does not mislead, defame, harass, exploit, or harm others",
        "Your content complies with these Terms and all applicable laws",
      ] },
    ],
  },
  {
    title: "6. Consent for Avatars, Voices, and Likeness",
    blocks: [
      { t: "p", v: "You may not create or use an avatar, voice, digital replica, or likeness of another person unless you have clear permission and legal authority to do so." },
      { t: "p", v: "You agree not to use Memorare Twin to:" },
      { t: "ul", v: [
        "Impersonate another person without consent",
        "Create unauthorized deepfakes",
        "Misrepresent someone’s identity or statements",
        "Use a person’s face or voice without permission",
        "Create misleading political, financial, medical, legal, or harmful content",
        "Deceive viewers into believing a real person said or did something they did not say or do",
      ] },
      { t: "p", v: "We may remove content or suspend accounts that violate these rules." },
    ],
  },
  {
    title: "7. Prohibited Uses",
    blocks: [
      { t: "p", v: "You agree not to use Memorare Twin for any unlawful, harmful, abusive, deceptive, or unauthorized purpose." },
      { t: "p", v: "You may not use the platform to create, upload, distribute, or promote content that:" },
      { t: "ul", v: [
        "Violates any law or regulation",
        "Infringes intellectual property rights",
        "Uses someone’s face, voice, or likeness without consent",
        "Is fraudulent, misleading, or deceptive",
        "Promotes hate, harassment, threats, or violence",
        "Contains sexually explicit or exploitative content",
        "Targets or exploits minors",
        "Encourages self-harm or harm to others",
        "Provides illegal instructions or dangerous activities",
        "Spreads malware, phishing, scams, or spam",
        "Misrepresents products, services, credentials, or endorsements",
        "Violates platform, advertising, or social media rules",
      ] },
      { t: "p", v: "We reserve the right to review, remove, block, or restrict content or accounts that we believe violate these Terms." },
    ],
  },
  {
    title: "8. AI-Generated Output",
    blocks: [
      { t: "p", v: "Memorare Twin may use artificial intelligence to generate or assist with content." },
      { t: "p", v: "You understand and agree that:" },
      { t: "ul", v: [
        "AI-generated content may not always be accurate, complete, or suitable for your intended use",
        "You are responsible for reviewing all output before publishing or distributing it",
        "AI output may require editing, fact-checking, or legal review",
        "Similar or identical output may be generated for other users",
        "We do not guarantee that generated content will be unique, error-free, or free from third-party claims",
      ] },
      { t: "p", v: "You should not rely on Memorare Twin as a substitute for professional legal, medical, financial, educational, or regulatory advice." },
    ],
  },
  {
    title: "9. Subscriptions, Tokens, and Payments",
    blocks: [
      { t: "p", v: "Memorare Twin may offer free plans, paid subscriptions, credits, tokens, or usage-based services." },
      { t: "p", v: "By purchasing a plan, token package, or service, you agree to pay all applicable fees." },
      { t: "p", v: "Fees, features, limits, and billing cycles may vary by plan." },
      { t: "p", v: "Unless otherwise stated:" },
      { t: "ul", v: [
        "Payments are due when charged",
        "Subscription fees may renew automatically",
        "Tokens or credits may be consumed when using AI features",
        "Unused tokens may expire depending on your plan",
        "Failed, canceled, or incomplete generations may be handled according to our platform policy",
        "Refunds are not guaranteed unless required by law or stated in a separate refund policy",
      ] },
      { t: "p", v: "You are responsible for maintaining accurate billing information." },
    ],
  },
  {
    title: "10. Free Trials and Promotions",
    blocks: [
      { t: "p", v: "We may offer free trials, promotional credits, or limited access to certain features." },
      { t: "p", v: "We may modify, limit, or end free trials and promotions at any time." },
      { t: "p", v: "Trial access may include restrictions on video length, quality, downloads, avatar creation, voice options, tokens, or commercial usage." },
    ],
  },
  {
    title: "11. Intellectual Property",
    blocks: [
      { t: "p", v: "The Memorare Twin platform, including its software, design, interface, branding, technology, workflows, templates, graphics, logos, and documentation, is owned by Memorare Twin or its licensors." },
      { t: "p", v: "You may not copy, modify, reverse engineer, resell, distribute, or create derivative works from the platform unless expressly permitted in writing." },
      { t: "p", v: "You may use generated videos in accordance with your plan and these Terms, provided that your use does not violate any law, third-party rights, or platform rules." },
    ],
  },
  {
    title: "12. Third-Party Services",
    blocks: [
      { t: "p", v: "Memorare Twin may rely on or integrate with third-party providers for AI processing, cloud hosting, payments, analytics, communications, media rendering, voice generation, avatar generation, or other services." },
      { t: "p", v: "Your use of Memorare Twin may involve third-party services that are subject to their own terms and policies." },
      { t: "p", v: "We are not responsible for third-party services, interruptions, errors, or policies." },
    ],
  },
  {
    title: "13. Platform Availability",
    blocks: [
      { t: "p", v: "We work to provide a reliable platform, but we do not guarantee that Memorare Twin will always be available, uninterrupted, secure, or error-free." },
      { t: "p", v: "The platform may be unavailable due to:" },
      { t: "ul", v: [
        "Maintenance",
        "Updates",
        "Server issues",
        "Third-party service outages",
        "Internet disruptions",
        "Security incidents",
        "High demand",
        "Technical failures",
      ] },
      { t: "p", v: "We may modify, suspend, or discontinue features at any time." },
    ],
  },
  {
    title: "14. Content Review and Enforcement",
    blocks: [
      { t: "p", v: "We may, but are not obligated to, review content, prompts, uploads, generated videos, or account activity to enforce these Terms, protect users, improve safety, comply with law, or prevent abuse." },
      { t: "p", v: "We may remove or restrict content that violates these Terms or creates legal, security, reputational, or operational risk." },
    ],
  },
  {
    title: "15. Termination",
    blocks: [
      { t: "p", v: "You may stop using Memorare Twin at any time." },
      { t: "p", v: "We may suspend or terminate your access if:" },
      { t: "ul", v: [
        "You violate these Terms",
        "You misuse the platform",
        "You fail to pay required fees",
        "Your activity creates legal or security risk",
        "We are required to do so by law",
        "We discontinue part or all of the service",
      ] },
      { t: "p", v: "After termination, you may lose access to your account, projects, media, tokens, generated content, and stored files." },
    ],
  },
  {
    title: "16. Disclaimers",
    blocks: [
      { t: "p", v: "Memorare Twin is provided on an “as is” and “as available” basis." },
      { t: "p", v: "To the fullest extent permitted by law, we disclaim all warranties, whether express, implied, or statutory, including warranties of merchantability, fitness for a particular purpose, title, non-infringement, accuracy, reliability, and availability." },
      { t: "p", v: "We do not guarantee that:" },
      { t: "ul", v: [
        "The platform will meet your requirements",
        "Generated videos will be error-free",
        "AI output will be accurate or unique",
        "Lip-sync or avatar quality will always be perfect",
        "The platform will be uninterrupted or secure",
        "Content will be suitable for every business, educational, legal, or commercial use",
      ] },
    ],
  },
  {
    title: "17. Limitation of Liability",
    blocks: [
      { t: "p", v: "To the fullest extent permitted by law, Memorare Twin and its owners, employees, contractors, affiliates, partners, and service providers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, including loss of profits, revenue, data, goodwill, business opportunities, or content." },
      { t: "p", v: "Our total liability for any claim related to the platform will not exceed the amount you paid to use Memorare Twin during the three months before the claim arose, or one hundred dollars, whichever is greater, unless otherwise required by law." },
    ],
  },
  {
    title: "18. Indemnification",
    blocks: [
      { t: "p", v: "You agree to defend, indemnify, and hold harmless Memorare Twin, its owners, employees, contractors, affiliates, partners, and service providers from any claims, damages, losses, liabilities, costs, or expenses arising from:" },
      { t: "ul", v: [
        "Your use of the platform",
        "Your User Content",
        "Your generated videos",
        "Your violation of these Terms",
        "Your violation of any law",
        "Your violation of third-party rights",
        "Your use of someone’s face, voice, likeness, brand, or copyrighted material without permission",
      ] },
    ],
  },
  {
    title: "19. Changes to These Terms",
    blocks: [
      { t: "p", v: "We may update these Terms from time to time." },
      { t: "p", v: "When we make changes, we will update the “Last Updated” date at the top of this page. If changes are significant, we may provide additional notice through the platform, email, or website." },
      { t: "p", v: "Your continued use of Memorare Twin after changes are posted means you accept the updated Terms." },
    ],
  },
  {
    title: "20. Governing Law",
    blocks: [
      { t: "p", v: "These Terms are governed by the laws of the State of New York, without regard to conflict of law principles." },
      { t: "p", v: "Any disputes will be handled in the courts located in New York County, New York, unless otherwise required by applicable law." },
    ],
  },
  {
    title: "21. Contact Us",
    blocks: [
      { t: "p", v: "If you have questions about these Terms & Conditions, contact us at:" },
      { t: "p", v: "Company: ibl.ai" },
      { t: "p", v: "Email: support@iblai.zendesk.com" },
      { t: "p", v: "Address: 600 3rd Ave, 2nd Floor, New York, NY 10016" },
      { t: "p", v: "Website: ibl.ai" },
    ],
  },
];
