"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type CurrentProfile = {
  username: string | null;
};

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const [{ data }, { count }, { count: messageCount }] = await Promise.all([
        supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null),
        supabase
          .from("direct_messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null),
      ]);

      setProfile(data);
      setUnreadCount(count ?? 0);
      setUnreadMessageCount(messageCount ?? 0);
      setLoading(false);
    };

    void loadProfile();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    router.push("/");
    router.refresh();
  };

  const profileHref = profile?.username ? `/user/${profile.username}` : "/onboarding";

  return (
    <header className="app-header">
      <nav className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="font-bold tracking-normal">
          MEGAMORPHOSIS
        </Link>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/" className="font-medium">
            Home
          </Link>
          <Link href="/discover" className="font-medium">
            Discover
          </Link>
          <Link href="/circles" className="font-medium">
            Circles
          </Link>
          <Link href="/search" className="font-medium">
            Search
          </Link>

          {!loading && profile && (
            <>
              <Link href="/dashboard" className="font-medium">
                Dashboard
              </Link>
              <Link href="/new-journey" className="font-medium">
                New Journey
              </Link>
              <Link href="/notifications" className="font-medium">
                Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
              </Link>
              <Link href="/messages" className="font-medium">
                Messages
                {unreadMessageCount > 0 ? ` (${unreadMessageCount})` : ""}
              </Link>
              <Link href={profileHref} className="font-medium">
                Profile
              </Link>
              <button onClick={handleLogout} className="font-medium">
                Logout
              </button>
            </>
          )}

          {!loading && !profile && (
            <>
              <Link href="/auth/login" className="font-medium">
                Log In
              </Link>
              <Link href="/auth/signup" className="font-medium">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
