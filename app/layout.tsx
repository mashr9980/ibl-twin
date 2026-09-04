import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { IblaiProviders } from "@/providers/iblai-providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// The middleware's nonce-based CSP requires per-request rendering: a statically
// prerendered page ships nonce-less <script> tags that enforce mode blocks
// (strict-dynamic disables 'self'/https: fallbacks), white-screening the
// deployed app. Remove this only if the CSP middleware goes too.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "memorare twin", template: "%s | memorare twin" },
  description: "Create AI avatar videos: pick or create an avatar, choose a voice, write a script.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Applied before first paint, so a dark session doesn't flash light on reload.
 * The class has to be on <html> before React hydrates, which only a blocking
 * inline script can do. It carries the CSP nonce that applyCsp stamps on the
 * request as `x-nonce`.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <IblaiProviders>{children}</IblaiProviders>
      </body>
    </html>
  );
}
