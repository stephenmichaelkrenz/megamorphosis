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
  "Production domain, Supabase auth, onboarding, and profile URLs",
  "Journeys, updates, milestones, visibility, and proof posts",
  "Follows, Respect, comments, notifications, DMs, and activity digest",
  "Circles, check-ins, blocking, reporting, and private moderation",
  "Welcome email, daily unread digest, account settings, and email preferences",
];

const remainingItems = [
  "Replace MVP legal pages with reviewed production policies before broad launch",
  "Create support@megamorphosis.com or an equivalent support intake",
  "Add export/delete-account flows before scaling beyond private launch",
  "Review analytics, payments, and email compliance before monetization",
  "Keep moderation queue ownership clear during the first user cohort",
];

const demoBeats = [
  "New user signs up, completes onboarding, and posts a first check-in",
  "Returning user lands on Today and sees the next best action",
  "User joins a Circle, follows people, comments, and sends a DM",
  "Owner or moderator handles reports, hidden comments, and blocking",
  "Email brings users back only when meaningful activity is unread",
];

const cohortSteps = [
  "Invite 10-15 people who are actively changing something specific",
  "Ask each person to create one Journey and post three check-ins in seven days",
  "Seed two or three Circles that match real goals in the cohort",
  "Check moderation, comments, DMs, and email logs daily during the first week",
  "Interview the best five users about what pulled them back or made them drift",
];

export default function LaunchPage() {
  return (
    <main className="page-shell">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Private Launch Readiness</h1>
        <p className="muted mt-2">
          A founder-facing snapshot of what is ready, what still needs care, and
          how to demo Megamorphosis clearly.
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
        <h2 className="mb-3 text-lg font-semibold">Before Broad Public Launch</h2>
        <ul className="space-y-2 text-sm">
          {remainingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel mb-5">
        <h2 className="mb-3 text-lg font-semibold">Demo Path</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          {demoBeats.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="panel mb-5">
        <h2 className="mb-3 text-lg font-semibold">First Cohort Plan</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          {cohortSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/auth/signup" className="btn-primary">
          Test Signup
        </Link>
        <Link href="/help" className="btn-secondary">
          Help
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
