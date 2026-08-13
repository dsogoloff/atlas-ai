import type { Metadata } from "next";
import localFont from "next/font/local";
import { getBranding } from "@/lib/branding";

import "./globals.css";

// SELF-HOSTED, DELIBERATELY. These were `next/font/google` until 2026-08-13,
// when Google 404'd the Plus Jakarta Sans woff2 URLs Next had resolved and the
// production build failed on a commit that changed only markdown. `next/font/
// google` downloads every weight from fonts.gstatic.com AT BUILD TIME, so a
// third-party CDN hiccup breaks our deploy. The files now live in ./fonts —
// see ./fonts/README.md for provenance, licensing, and how to update one.
//
// Each family is the LATIN VARIABLE file, so one file spans the whole weight
// range the app uses (the old config pulled ~21 static instances). The ranges
// below match the weights the previous config requested, so rendering is
// unchanged. Do NOT reintroduce next/font/google.

const plusJakarta = localFont({
  src: "./fonts/plus-jakarta-sans-latin.woff2",
  variable: "--font-plus-jakarta",
  weight: "400 800",
  display: "swap",
});

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "400 600",
  display: "swap",
});

const playfairDisplay = localFont({
  src: [
    {
      path: "./fonts/playfair-display-latin.woff2",
      weight: "400 700",
      style: "normal",
    },
    {
      path: "./fonts/playfair-display-italic-latin.woff2",
      weight: "400 700",
      style: "italic",
    },
  ],
  variable: "--font-playfair-display",
  display: "swap",
  // Serif metrics for the auto-generated fallback face; the sans families keep
  // the default (Arial). Without this a serif would be size-matched to a
  // sans-serif and shift on swap.
  adjustFontFallback: "Times New Roman",
});

const dmSans = localFont({
  src: "./fonts/dm-sans-latin.woff2",
  variable: "--font-dm-sans",
  weight: "300 700",
  display: "swap",
});

// Browser <title>, meta and OG/social strings are tenant-resolved — see
// src/lib/branding. Never hardcode a product name here.
const branding = getBranding();

export const metadata: Metadata = {
  title: branding.meta.title,
  description: branding.meta.description,
  icons: { icon: branding.faviconHref },
  openGraph: {
    title: branding.meta.ogTitle,
    description: branding.meta.description,
    siteName: branding.meta.siteName,
  },
  twitter: {
    card: "summary",
    title: branding.meta.ogTitle,
    description: branding.meta.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`light ${plusJakarta.variable} ${inter.variable} ${playfairDisplay.variable} ${dmSans.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="font-body-regular min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
