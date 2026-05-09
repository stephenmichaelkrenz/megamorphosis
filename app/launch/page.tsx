import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Start Here",
  description:
    "Start using Megamorphosis to share progress, find support, and build visible momentum.",
  alternates: {
    canonical: "/launch",
  },
};

const momentumLoops = [
  {
    label: "Post proof",
    body: "Share one visible move you made today. Small updates count because consistency is the point.",
  },
  {
    label: "Choose a focus",
    body: "Tag progress as Mind, Body, Work, Relationships, Faith, Creative, or Recovery so people can find the lane they care about.",
  },
  {
    label: "Support others",
    body: "React with Respect, Inspired, Same, or Keep going when someone else is doing the work.",
  },
];

const firstWeekSteps = [
  "Create your profile so people can recognize you.",
  "Post three check-ins about one real change you are making.",
  "Follow people whose progress makes you want to show up.",
  "Join or browse Circles around the kind of transformation you are building.",
  "Come back to your dashboard to see reactions, comments, and the next best move.",
];

const goodUpdates = [
  "What changed today, even if it was small",
  "What felt hard and what you did anyway",
  "What you learned about yourself",
  "What you are doing next",
  "Where support, advice, or accountability would help",
];

const communityPromises = [
  "Progress is better than performance.",
  "Specific support beats empty hype.",
  "You can build in public or keep parts private.",
  "Respect the person behind the update.",
];

export default function LaunchPage() {
  return (
    <main className="page-shell">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Start building visible momentum</h1>
        <p className="muted mt-2">
          Megamorphosis is for people actively changing something in their life
          and willing to share proof of the work as it happens.
        </p>
      </section>

      <section className="panel mb-5">
        <h2 className="mb-3 text-lg font-semibold">How it works</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {momentumLoops.map((item) => (
            <div key={item.label}>
              <span className="metric-pill metric-pill-proof text-xs">
                {item.label}
              </span>
              <p className="muted mt-3 text-sm">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel mb-5">
        <h2 className="mb-3 text-lg font-semibold">Your first week</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          {firstWeekSteps.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>

      <section className="panel mb-5">
        <h2 className="mb-3 text-lg font-semibold">What makes a good update</h2>
        <ul className="space-y-2 text-sm">
          {goodUpdates.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="panel mb-5">
        <h2 className="mb-3 text-lg font-semibold">Community tone</h2>
        <ul className="space-y-2 text-sm">
          {communityPromises.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/auth/signup" className="btn-primary">
          Start Your Journey
        </Link>
        <Link href="/" className="btn-secondary">
          See the Feed
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
