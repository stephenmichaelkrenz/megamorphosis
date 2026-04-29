import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Moderation",
  description: "Megamorphosis moderation tools.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ModerationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
