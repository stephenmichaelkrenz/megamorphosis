import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help",
  description: "Megamorphosis help, safety, and support guidance.",
  alternates: {
    canonical: "/help",
  },
};

export default function HelpPage() {
  return (
    <main className="page-shell">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Help & Safety</h1>
        <p className="muted mt-2">
          Practical guidance for using Megamorphosis with care.
        </p>
      </section>

      <div className="space-y-5">
        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Community Standards</h2>
          <p className="text-sm leading-6">
            Megamorphosis is for documenting progress, sharing transformation
            journeys, and supporting people who are building visible momentum.
            Do not harass, impersonate, spam, threaten, exploit, or pressure
            other users.
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Reporting Comments</h2>
          <p className="text-sm leading-6">
            Use report actions on comments that violate the spirit of the
            community. Reported content is routed to the private moderation area
            for review. Journey owners can also hide comments on their own
            journeys.
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Blocking Users</h2>
          <p className="text-sm leading-6">
            Blocking is available when another user should not be able to
            interact with you. It helps reduce unwanted contact through comments
            and direct messages.
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Account & Email Controls</h2>
          <p className="text-sm leading-6">
            Use Account Settings to control daily digest emails, send a password
            reset link, or sign out everywhere. Digest emails are only sent when
            comments or direct messages are unread.
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Support</h2>
          <p className="text-sm leading-6">
            A dedicated support inbox is coming. Until then, use in-app reports
            for safety issues and keep sensitive personal information out of
            public posts, journeys, comments, and Circle check-ins.
          </p>
        </section>
      </div>
    </main>
  );
}

