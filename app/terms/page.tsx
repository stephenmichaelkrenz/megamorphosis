import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Megamorphosis terms notice.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
  return (
    <main className="page-shell">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Terms</h1>
        <p className="muted mt-2">Last updated: May 3, 2026</p>
      </section>

      <div className="space-y-5">
        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Use the Product Honestly</h2>
          <p className="text-sm leading-6">
            Megamorphosis is for documenting progress, sharing transformation
            journeys, and supporting other users. Do not use the product to
            harass, impersonate, exploit, spam, or harm other people.
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Your Content</h2>
          <p className="text-sm leading-6">
            You are responsible for the posts, journeys, updates, images, and
            comments you publish or send. Only share content you have the right
            to share and avoid posting private information about other people.
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Moderation</h2>
          <p className="text-sm leading-6">
            Megamorphosis may hide, limit, or remove content and accounts that
            undermine user safety or the health of the community. Users can
            report comments and block people who should not be able to contact
            them.
          </p>
        </section>

        <section className="panel">
          <h2 className="mb-2 text-lg font-semibold">Launch Note</h2>
          <p className="text-sm leading-6">
            These are MVP placeholder terms. Before accepting a broad public user
            base, Megamorphosis should replace this page with reviewed terms that
            cover subscriptions, refunds, content rights, age limits, acceptable
            use, support obligations, email communications, data export, and
            account deletion.
          </p>
        </section>
      </div>
    </main>
  );
}
