"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ConnectionKind = "followers" | "following";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
};

type FollowRow = {
  follower_id: string;
  following_id: string;
  created_at: string;
};

export default function ProfileConnections({
  username,
  kind,
}: {
  username: string;
  kind: ConnectionKind;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [connections, setConnections] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const copy = useMemo(() => {
    const isFollowers = kind === "followers";

    return {
      title: isFollowers ? "Followers" : "Following",
      empty: isFollowers
        ? "No followers yet."
        : "Not following anyone yet.",
      relationColumn: isFollowers ? "following_id" : "follower_id",
      connectionColumn: isFollowers ? "follower_id" : "following_id",
    };
  }, [kind]);

  useEffect(() => {
    const loadConnections = async () => {
      setLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio")
        .eq("username", username)
        .maybeSingle();

      setProfile(profileData);

      if (!profileData) {
        setConnections([]);
        setLoading(false);
        return;
      }

      const { data: followData } = await supabase
        .from("follows")
        .select("follower_id, following_id, created_at")
        .eq(copy.relationColumn, profileData.id)
        .order("created_at", { ascending: false });

      const follows = (followData ?? []) as FollowRow[];
      const connectionIds = follows.map((follow) =>
        kind === "followers" ? follow.follower_id : follow.following_id,
      );

      if (connectionIds.length === 0) {
        setConnections([]);
        setLoading(false);
        return;
      }

      const { data: connectionData } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio")
        .in("id", connectionIds);

      const connectionMap = new Map(
        ((connectionData ?? []) as Profile[]).map((connection) => [
          connection.id,
          connection,
        ]),
      );

      setConnections(
        connectionIds
          .map((id) => connectionMap.get(id))
          .filter((connection): connection is Profile => Boolean(connection)),
      );
      setLoading(false);
    };

    void loadConnections();
  }, [copy.connectionColumn, copy.relationColumn, kind, username]);

  if (loading) {
    return <main className="page-shell">Loading connections...</main>;
  }

  if (!profile) {
    return <main className="page-shell">Profile not found.</main>;
  }

  return (
    <main className="page-shell">
      <Link href={`/user/${profile.username}`} className="muted text-sm font-semibold">
        Back to profile
      </Link>

      <section className="mt-4 mb-6">
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="muted mt-1 text-sm">
          {profile.display_name || `@${profile.username}`}
        </p>
      </section>

      {connections.length === 0 ? (
        <p className="muted panel">{copy.empty}</p>
      ) : (
        <div className="space-y-3">
          {connections.map((connection) => (
            <Link
              key={connection.id}
              href={
                connection.username
                  ? `/user/${connection.username}`
                  : "/discover"
              }
              className="link-panel"
            >
              <p className="font-semibold">
                {connection.display_name || "No Name"}
              </p>
              {connection.username && (
                <p className="muted mt-1 text-sm">@{connection.username}</p>
              )}
              {connection.bio && <p className="mt-2 text-sm">{connection.bio}</p>}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
