import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import "./globals.css";

const siteUrl = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.megamorphosis.com",
);

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: "Megamorphosis",
    template: "%s | Megamorphosis",
  },
  description:
    "Megamorphosis helps people track transformation journeys, share progress, and build momentum through proof.",
  applicationName: "Megamorphosis",
  keywords: [
    "transformation",
    "progress tracking",
    "journeys",
    "goals",
    "accountability",
    "social progress",
  ],
  authors: [{ name: "Megamorphosis" }],
  creator: "Megamorphosis",
  publisher: "Megamorphosis",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Megamorphosis",
    title: "Megamorphosis",
    description:
      "Track your transformation, share proof of progress, and follow people building real momentum.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Megamorphosis",
    description:
      "Track your transformation, share proof of progress, and follow people building real momentum.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Navbar />
        <div className="flex-1">{children}</div>
        <footer className="app-footer">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5 text-sm">
            <p className="muted">(c) {new Date().getFullYear()} Megamorphosis</p>
            <div className="flex gap-4">
              <Link href="/launch" className="font-medium">
                Launch
              </Link>
              <Link href="/privacy" className="font-medium">
                Privacy
              </Link>
              <Link href="/terms" className="font-medium">
                Terms
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
