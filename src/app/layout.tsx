import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atlas Assessment | Diagnostic Excellence",
  description:
    "S.A.M. Atlas Assessment — an AI-adaptive Singapore Math diagnostic that pinpoints a child's level and learning gaps in ~15 minutes. Powered by Inspirea Labs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`light ${plusJakarta.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="font-body-regular min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
