import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Megamorphosis privacy notice.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Privacy</h1>
        <p className="muted mt-2">Last updated: May 3, 2026</p>
      </section>

      <div className="space-y-5">
        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">What Megamorphosis Stores</h2>
          <p className="text-sm leading-6">
            Megamorphosis stores account information, profile details, posts,
            journeys, updates, uploaded evidence image URLs, comments, follows,
            respects, notifications, direct messages, reports, and blocks that
            you choose to create while using the app. Email preferences are also
            stored so users can control daily digest emails.
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">How It Is Used</h2>
          <p className="text-sm leading-6">
            This information is used to run the product: showing your profile,
            displaying public journeys, powering feeds, notifications, search,
            discovery, and moderation controls.
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Visibility</h2>
          <p className="text-sm leading-6">
            Public profiles, public journeys, posts, and visible comments may be
            seen by other users. Direct messages, dashboard, notifications,
            settings, and moderation areas are protected by account access and
            database policies.
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Launch Note</h2>
          <p className="text-sm leading-6">
            This is a starter privacy notice for the MVP. Before a broad public
            launch, Megamorphosis should replace this page with a reviewed
            policy that matches the final product, analytics, payments, support,
            email, export, deletion, and data retention practices.
          </p>
        </section>
      </div>
    </main>
  );
}
