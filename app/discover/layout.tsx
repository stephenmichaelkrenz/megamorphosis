import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover",
  description:
    "Find public transformation journeys, active Circles, and people making visible progress on Megamorphosis.",
  alternates: {
    canonical: "/discover",
  },
  openGraph: {
    type: "website",
    url: "/discover",
    siteName: "Megamorphosis",
    title: "Discover transformation journeys",
    description:
      "Browse public journeys, active Circles, and people building momentum through proof.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Discover transformation journeys",
    description:
      "Browse public journeys, active Circles, and people building momentum through proof.",
  },
};

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
