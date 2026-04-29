import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Circle",
  description: "Create a Megamorphosis Circle.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Create Circle",
    description: "Create a Megamorphosis Circle.",
  },
  twitter: {
    title: "Create Circle",
    description: "Create a Megamorphosis Circle.",
  },
};

export default function NewCircleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
