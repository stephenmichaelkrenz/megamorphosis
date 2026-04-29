import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publicDescription, siteName, truncateDescription } from "@/lib/seo";

type CircleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CircleLayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: circle } = await supabase
    .from("circles")
    .select("name, slug, description, category, is_public")
    .eq("slug", slug)
    .maybeSingle();

  if (!circle?.is_public) {
    return {
      title: "Circle not found",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = `${circle.name} Circle`;
  const description =
    truncateDescription(circle.description) ??
    (circle.category
      ? `Join the ${circle.category} Circle on ${siteName}.`
      : publicDescription);

  return {
    title,
    description,
    alternates: {
      canonical: `/circles/${circle.slug}`,
    },
    openGraph: {
      type: "website",
      url: `/circles/${circle.slug}`,
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

export default function CircleLayout({ children }: CircleLayoutProps) {
  return children;
}
