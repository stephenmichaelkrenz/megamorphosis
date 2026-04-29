"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import JourneyStatusBadge from "@/components/JourneyStatusBadge";
import MilestoneProgressBadge from "@/components/MilestoneProgressBadge";
import { followUser, unfollowUser } from "@/lib/follow";
import { supabase } from "@/lib/supabaseClient";
import { Journey } from "@/types";

type DiscoverCircle = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  member_count: number;
};

type DiscoverProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  followers_count?: number;
  following_count?: number;
};

type DiscoverJourney = Journey & {
  profile?: Pick<DiscoverProfile, "id" | "username" | "display_name">;
};

type Notice = {
  type: "error" | "success";
  message: string;
};

export default function DiscoverPage() {
  const [circles, setCircles] = useState<DiscoverCircle[]>([]);
  const [profiles, setProfiles] = useState<DiscoverProfile[]>([]);
  const [journeys, setJourneys] = useState<DiscoverJourney[]>([]);
  const [milestoneCounts, setMilestoneCounts] = useState<
    Record<string, { completed: number; total: number }>
  >({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [workingFollowId, setWorkingFollowId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDiscover = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      const [
        { data: circlesData },
        { data: profilesData },
        { data: journeysData },
        { data: follows },
      ] = await Promise.all([
          supabase
            .from("circles")
            .select("id, name, slug, description, category")
            .eq("is_public", true)
            .order("created_at", { ascending: true })
            .limit(4),
          supabase
            .from("profiles")
            .select("id, username, display_name, bio")
            .eq("onboarded", true)
            .order("created_at", { ascending: false })
            .limit(24),
          supabase
            .from("journeys")
            .select("id, user_id, title, category, goal_text, status, visibility, archived_at, created_at, updated_at")
            .eq("visibility", "public")
            .is("archived_at", null)
            .order("created_at", { ascending: false })
            .limit(12),
          user
            ? supabase
                .from("follows")
                .select("following_id")
                .eq("follower_id", user.id)
            : Promise.resolve({ data: [] }),
        ]);

      const profileRows = profilesData ?? [];
      const circleRows = circlesData ?? [];
      const journeyRows = journeysData ?? [];
      const circleIds = circleRows.map((circle) => circle.id);
      const profileIds = profileRows.map((profile) => profile.id);
      const journeyUserIds = Array.from(
        new Set(journeyRows.map((journey) => journey.user_id)),
      );
      const journeyIds = journeyRows.map((journey) => journey.id);

      const [
        { data: circleMemberRows },
        { data: followerRows },
        { data: followingRows },
        { data: milestoneRows },
        { data: journeyProfiles },
      ] = await Promise.all([
        circleIds.length
          ? supabase
              .from("circle_members")
              .select("circle_id")
              .in("circle_id", circleIds)
          : Promise.resolve({ data: [] }),
        profileIds.length
          ? supabase
              .from("follows")
              .select("following_id")
              .in("following_id", profileIds)
          : Promise.resolve({ data: [] }),
        profileIds.length
          ? supabase
              .from("follows")
              .select("follower_id")
              .in("follower_id", profileIds)
          : Promise.resolve({ data: [] }),
        journeyIds.length
          ? supabase
              .from("journey_milestones")
              .select("journey_id, completed_at")
              .in("journey_id", journeyIds)
          : Promise.resolve({ data: [] }),
        journeyUserIds.length
          ? supabase
              .from("profiles")
              .select("id, username, display_name")
              .in("id", journeyUserIds)
          : Promise.resolve({ data: [] }),
      ]);

      const followerCounts = new Map<string, number>();
      const followingCounts = new Map<string, number>();
      const circleMemberCounts = new Map<string, number>();

      circleMemberRows?.forEach((member) => {
        circleMemberCounts.set(
          member.circle_id,
          (circleMemberCounts.get(member.circle_id) ?? 0) + 1,
        );
      });

      followerRows?.forEach((follow) => {
        followerCounts.set(
          follow.following_id,
          (followerCounts.get(follow.following_id) ?? 0) + 1,
        );
      });

      followingRows?.forEach((follow) => {
        followingCounts.set(
          follow.follower_id,
          (followingCounts.get(follow.follower_id) ?? 0) + 1,
        );
      });

      const nextMilestoneCounts: Record<
        string,
        { completed: number; total: number }
      > = Object.fromEntries(
        journeyIds.map((journeyId) => [journeyId, { completed: 0, total: 0 }]),
      );

      milestoneRows?.forEach((milestone) => {
        const counts = nextMilestoneCounts[milestone.journey_id] ?? {
          completed: 0,
          total: 0,
        };

        counts.total += 1;
        if (milestone.completed_at) counts.completed += 1;
        nextMilestoneCounts[milestone.journey_id] = counts;
      });

      setCircles(
        circleRows.map((circle) => ({
          ...circle,
          member_count: circleMemberCounts.get(circle.id) ?? 0,
        })),
      );
      setProfiles(
        profileRows.map((profile) => ({
          ...profile,
          followers_count: followerCounts.get(profile.id) ?? 0,
          following_count: followingCounts.get(profile.id) ?? 0,
        })),
      );
      setJourneys(
        journeyRows.map((journey) => ({
          ...journey,
          profile: journeyProfiles?.find(
            (profile) => profile.id === journey.user_id,
          ),
        })),
      );
      setMilestoneCounts(nextMilestoneCounts);
      setFollowingIds(new Set(follows?.map((follow) => follow.following_id) ?? []));
      setLoading(false);
    };

    void loadDiscover();
  }, []);

  const toggleFollow = async (profile: DiscoverProfile) => {
    if (!currentUserId) {
      setNotice({ type: "error", message: "Log in to follow people." });
      return;
    }

    const isFollowing = followingIds.has(profile.id);
    setWorkingFollowId(profile.id);
    setNotice(null);
    const { error } = isFollowing
      ? await unfollowUser(profile.id)
      : await followUser(profile.id);

    if (error) {
      setWorkingFollowId(null);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setFollowingIds((current) => {
      const next = new Set(current);

      if (isFollowing) {
        next.delete(profile.id);
      } else {
        next.add(profile.id);
      }

      return next;
    });
    setWorkingFollowId(null);
    setNotice({
      type: "success",
      message: isFollowing ? "Unfollowed." : "Following added.",
    });
  };

  const renderFollowButton = (targetUserId: string) => {
    if (!currentUserId || currentUserId === targetUserId) return null;

    const isFollowing = followingIds.has(targetUserId);

    return (
      <button
        onClick={() =>
          toggleFollow({
            id: targetUserId,
            username: null,
            display_name: null,
            bio: null,
          })
        }
        className={isFollowing ? "btn-secondary shrink-0" : "btn-primary shrink-0"}
        disabled={workingFollowId === targetUserId}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    );
  };

  if (loading) {
    return <main className="wide-shell">Loading discover...</main>;
  }

  return (
    <main className="wide-shell">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Discover</h1>
        <p className="muted mt-2">
          Find people making progress and journeys worth following.
        </p>
        {notice && (
          <p className={`notice notice-${notice.type} mt-4`}>
            {notice.message}
          </p>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="section-heading">Circles</h2>
          <Link href="/circles" className="text-sm font-semibold">
            View all
          </Link>
        </div>

        {circles.length === 0 ? (
          <div className="panel">
            <p className="font-semibold">No Circles yet.</p>
            <p className="muted mt-2 text-sm">
              Public Circles will appear here as the community forms around
              shared transformations.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {circles.map((circle) => (
              <article key={circle.id} className="panel">
                <Link href={`/circles/${circle.slug}`} className="font-semibold">
                  {circle.name}
                </Link>
                {circle.category && (
                  <p className="muted mt-1 text-sm">{circle.category}</p>
                )}
                {circle.description && (
                  <p className="mt-3 text-sm">{circle.description}</p>
                )}
                <p className="muted mt-3 text-xs">
                  {circle.member_count}{" "}
                  {circle.member_count === 1 ? "member" : "members"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="section-heading mb-3">People</h2>

        {profiles.length === 0 ? (
          <div className="panel">
            <p className="font-semibold">No public profiles yet.</p>
            <p className="muted mt-2 text-sm">
              Onboarded members will show up here once profiles are ready to
              browse.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {profiles.map((profile) => {
              const isSelf = currentUserId === profile.id;
              const isFollowing = followingIds.has(profile.id);

              return (
                <article key={profile.id} className="panel">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={
                          profile.username
                            ? `/user/${profile.username}`
                            : `/user/${profile.id}`
                        }
                        className="font-semibold"
                      >
                        {profile.display_name || "No Name"}
                      </Link>
                      <p className="muted mt-1 text-sm">@{profile.username}</p>
                    </div>

                    {currentUserId && !isSelf && (
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        {profile.username && (
                          <Link
                            href={`/messages?to=${encodeURIComponent(profile.username)}`}
                            className="btn-secondary"
                          >
                            Message
                          </Link>
                        )}
                        <button
                          onClick={() => toggleFollow(profile)}
                          className={isFollowing ? "btn-secondary" : "btn-primary"}
                          disabled={workingFollowId === profile.id}
                        >
                          {isFollowing ? "Following" : "Follow"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="muted mt-3 flex gap-3 text-xs">
                    <span>
                      {profile.followers_count ?? 0}{" "}
                      {(profile.followers_count ?? 0) === 1
                        ? "follower"
                        : "followers"}
                    </span>
                    <span>{profile.following_count ?? 0} following</span>
                  </div>

                  {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-heading mb-3">Recent Journeys</h2>

        {journeys.length === 0 ? (
          <div className="panel">
            <p className="font-semibold">No public journeys yet.</p>
            <p className="muted mt-2 text-sm">
              Public transformation stories will appear here as people start
              posting proof.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {journeys.map((journey) => (
              <article key={journey.id} className="panel">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/journey/${journey.id}`} className="font-semibold">
                    {journey.title}
                  </Link>
                  {renderFollowButton(journey.user_id)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <JourneyStatusBadge status={journey.status} />
                  <MilestoneProgressBadge
                    completed={milestoneCounts[journey.id]?.completed ?? 0}
                    total={milestoneCounts[journey.id]?.total ?? 0}
                  />
                  {journey.category && (
                    <p className="muted text-sm">{journey.category}</p>
                  )}
                </div>
                {journey.profile?.username && (
                  <p className="muted mt-1 text-sm">
                    by{" "}
                    <Link
                      href={`/user/${journey.profile.username}`}
                      className="font-semibold"
                    >
                      @{journey.profile.username}
                    </Link>
                  </p>
                )}
                {journey.goal_text && (
                  <p className="mt-2 text-sm">{journey.goal_text}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
