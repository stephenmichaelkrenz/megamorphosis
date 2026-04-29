import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicDescription, siteName, truncateDescription } from "@/lib/seo";

type UserLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: UserLayoutProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, bio, onboarded")
    .eq("username", username)
    .maybeSingle();

  if (!profile?.onboarded) {
    return {
      title: "Profile not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const handle = profile.username ? `@${profile.username}` : "Profile";
  const title = profile.display_name
    ? `${profile.display_name} (${handle})`
    : handle;
  const description =
    truncateDescription(profile.bio) ??
    `Follow ${handle}'s transformation journeys on ${siteName}.`;

  return {
    title,
    description,
    alternates: {
      canonical: profile.username ? `/user/${profile.username}` : undefined,
    },
    openGraph: {
      type: "profile",
      url: profile.username ? `/user/${profile.username}` : undefined,
      siteName,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description || publicDescription,
    },
  };
}

export default function UserLayout({ children }: UserLayoutProps) {
  return children;
}
