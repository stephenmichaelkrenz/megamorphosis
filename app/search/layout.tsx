import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search Megamorphosis for people, public journeys, and transformation Circles.",
  alternates: {
    canonical: "/search",
  },
  openGraph: {
    type: "website",
    url: "/search",
    siteName: "Megamorphosis",
    title: "Search Megamorphosis",
    description:
      "Find people, public journeys, and Circles across the Megamorphosis community.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Search Megamorphosis",
    description:
      "Find people, public journeys, and Circles across the Megamorphosis community.",
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
