import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Launch Status",
  description: "Megamorphosis launch-readiness notes.",
  alternates: {
    canonical: "/launch",
  },
};

const readyItems = [
  "Authentication, onboarding, and profile URLs",
  "Journey creation, updates, milestones, and visibility",
  "Follows, Respect, comments, notifications, and DMs",
  "Circles, check-ins, blocking, reports, and role-gated moderation",
  "Privacy, terms, sitemap, robots, and production checklist",
];

const remainingItems = [
  "Replace MVP legal pages with reviewed production language",
  "Confirm production Supabase Auth redirect URLs",
  "Confirm storage policies for journey update images",
  "Connect Vercel and DNS for www.megamorphosis.com",
  "Confirm production platform moderator rows after first admin onboarding",
];

export default function LaunchPage() {
  return (
    <main className="page-shell">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Launch Status</h1>
        <p className="muted mt-2">
          A practical snapshot of what is ready and what still needs review
          before opening Megamorphosis broadly.
        </p>
      </section>

      <section className="panel mb-5">
        <h2 className="mb-3 text-lg font-semibold">Ready in the MVP</h2>
        <ul className="space-y-2 text-sm">
          {readyItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel mb-5">
        <h2 className="mb-3 text-lg font-semibold">Before Public Launch</h2>
        <ul className="space-y-2 text-sm">
          {remainingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/auth/signup" className="btn-primary">
          Test Signup
        </Link>
        <Link href="/privacy" className="btn-secondary">
          Privacy
        </Link>
        <Link href="/terms" className="btn-secondary">
          Terms
        </Link>
      </div>
    </main>
  );
}
