import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Circles",
  description:
    "Join Megamorphosis Circles built around shared transformation goals, accountability, and check-ins.",
  alternates: {
    canonical: "/circles",
  },
  openGraph: {
    type: "website",
    url: "/circles",
    siteName: "Megamorphosis",
    title: "Megamorphosis Circles",
    description:
      "Join transformation spaces organized around shared goals, accountability, and steady progress.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Megamorphosis Circles",
    description:
      "Join transformation spaces organized around shared goals, accountability, and steady progress.",
  },
};

export default function CirclesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
