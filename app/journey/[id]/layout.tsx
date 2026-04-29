import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicDescription, siteName, truncateDescription } from "@/lib/seo";

type JourneyLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: JourneyLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: journey } = await supabase
    .from("journeys")
    .select("id, title, goal_text, category, visibility, archived_at")
    .eq("id", id)
    .maybeSingle();

  if (!journey) {
    return {
      title: "Journey not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const isPublic = journey.visibility === "public" && !journey.archived_at;
  const title = journey.title;
  const description =
    truncateDescription(journey.goal_text) ??
    (journey.category
      ? `Follow this ${journey.category} transformation journey on ${siteName}.`
      : publicDescription);

  return {
    title,
    description,
    alternates: {
      canonical: `/journey/${journey.id}`,
    },
    robots: {
      index: isPublic,
      follow: isPublic,
    },
    openGraph: {
      type: "article",
      url: `/journey/${journey.id}`,
      siteName,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function JourneyLayout({ children }: JourneyLayoutProps) {
  return children;
}
