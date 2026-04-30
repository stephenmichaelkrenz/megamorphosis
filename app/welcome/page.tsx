"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DailyCheckInComposer from "@/components/DailyCheckInComposer";
import { supabase } from "@/lib/supabaseClient";

type WelcomeProfile = {
  username: string | null;
  display_name: string | null;
  onboarded: boolean | null;
};

const nextSteps = [
  {
    title: "Explore Circles",
    body: "Find a focused room where your next change has company.",
    href: "/circles",
  },
  {
    title: "Discover People",
    body: "Follow a few builders so your feed starts feeling alive.",
    href: "/discover",
  },
  {
    title: "Start a Journey",
    body: "Turn a goal into a public thread of progress.",
    href: "/new-journey",
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<WelcomeProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadWelcome = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/auth/signup");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, onboarded")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      if (!data?.onboarded) {
        router.replace("/onboarding");
        return;
      }

      setCurrentUserId(user.id);
      setProfile(data);
      setLoading(false);
    };

    void loadWelcome();
  }, [router]);

  const createPost = async (content: string) => {
    const trimmedContent = content.trim();

    if (!trimmedContent || !currentUserId) return;

    setPosting(true);

    const { error } = await supabase.from("posts").insert({
      user_id: currentUserId,
      content: trimmedContent,
    });

    if (error) {
      alert(error.message);
      setPosting(false);
      return;
    }

    setNewPost("");
    setPosted(true);
    setPosting(false);
  };

  if (loading) {
    return <main className="page-shell">Loading welcome...</main>;
  }

  const profileHref = profile?.username ? `/user/${profile.username}` : "/dashboard";

  return (
    <main className="page-shell">
      <p className="muted mb-2 text-sm font-semibold">Step 2 of 2</p>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}.
        </h1>
        <p className="muted mt-2 text-sm">
          Your profile is ready. Post one check-in, then pick a place to connect.
        </p>
      </div>

      <section className="panel mb-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <span className="metric-pill text-xs">Done</span>
            <h2 className="mt-3 font-semibold">Profile</h2>
            <p className="muted mt-1 text-sm">Your public identity is set.</p>
          </div>
          <div>
            <span className="metric-pill text-xs">{posted ? "Done" : "Next"}</span>
            <h2 className="mt-3 font-semibold">First Check-In</h2>
            <p className="muted mt-1 text-sm">Show the feed what you are building.</p>
          </div>
          <div>
            <span className="metric-pill text-xs">After</span>
            <h2 className="mt-3 font-semibold">Connect</h2>
            <p className="muted mt-1 text-sm">Find Circles and people to follow.</p>
          </div>
        </div>
      </section>

      {posted ? (
        <section className="panel mb-8">
          <h2 className="text-lg font-semibold">First check-in posted.</h2>
          <p className="muted mt-2 text-sm">
            Good. Now give your feed something to pull from: join a Circle, follow a
            few people, or start a Journey.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/circles" className="btn-primary">
              Explore Circles
            </Link>
            <Link href="/discover" className="btn-secondary">
              Discover People
            </Link>
            <Link href={profileHref} className="btn-secondary">
              View Profile
            </Link>
          </div>
        </section>
      ) : (
        <DailyCheckInComposer
          value={newPost}
          posting={posting}
          onChange={setNewPost}
          onSubmit={createPost}
        />
      )}

      <section>
        <h2 className="section-heading mb-3">Keep Going</h2>
        <div className="grid gap-3">
          {nextSteps.map((step) => (
            <Link key={step.href} href={step.href} className="link-panel">
              <h3 className="font-semibold">{step.title}</h3>
              <p className="muted mt-1 text-sm">{step.body}</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
