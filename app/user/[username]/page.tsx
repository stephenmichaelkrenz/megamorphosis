"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import EditablePostCard from "@/components/EditablePostCard";
import JourneyStatusBadge from "@/components/JourneyStatusBadge";
import JourneyVisibilityBadge from "@/components/JourneyVisibilityBadge";
import MilestoneProgressBadge from "@/components/MilestoneProgressBadge";
import ProBadge from "@/components/ProBadge";
import { getCheckInFocus } from "@/lib/dailyCheckIn";
import { followUser, unfollowUser } from "@/lib/follow";
import { achievementLabels, calculateDailyStreak } from "@/lib/gamification";
import { supabase } from "@/lib/supabaseClient";
import { Journey, Post } from "@/types";

type ProfilePost = Post & {
  respect_count: number;
  respected_by_me: boolean;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  subscription_tier: string | null;
};

type ProfileMomentum = {
  journeyStreak: number;
  circleCheckinStreak: number;
  completedMilestones: number;
  updateCount: number;
  badges: string[];
};

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [milestoneCounts, setMilestoneCounts] = useState<
    Record<string, { completed: number; total: number }>
  >({});
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [momentum, setMomentum] = useState<ProfileMomentum>({
    journeyStreak: 0,
    circleCheckinStreak: 0,
    completedMilestones: 0,
    updateCount: 0,
    badges: [],
  });
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, subscription_tier")
        .eq("username", username)
        .maybeSingle();

      setProfile(profileData);
      setJourneys([]);
      setMilestoneCounts({});
      setPosts([]);
      setMomentum({
        journeyStreak: 0,
        circleCheckinStreak: 0,
        completedMilestones: 0,
        updateCount: 0,
        badges: [],
      });

      if (!profileData) {
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);
      const isOwnProfileNext = user?.id === profileData.id;
      let journeysQuery = supabase
        .from("journeys")
        .select("id, user_id, title, category, goal_text, status, visibility, archived_at, created_at, updated_at")
        .eq("user_id", profileData.id)
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (!isOwnProfileNext) {
        journeysQuery = journeysQuery.eq("visibility", "public");
      }

      const [
        { count: nextFollowersCount },
        { count: nextFollowingCount },
        { data: journeysData },
        { data: postsData },
      ] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileData.id),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profileData.id),
        journeysQuery,
        supabase
          .from("posts")
          .select("id, user_id, content, created_at, updated_at")
          .eq("user_id", profileData.id)
          .order("created_at", { ascending: false }),
      ]);

      const postIds = postsData?.map((post) => post.id) ?? [];
      const journeyRows = journeysData ?? [];
      const journeyIds = journeyRows.map((journey) => journey.id);
      const { data: milestoneRows } = journeyIds.length
        ? await supabase
            .from("journey_milestones")
            .select("journey_id, completed_at")
            .in("journey_id", journeyIds)
        : { data: [] };
      const [{ data: updateRows }, { data: checkinRows }] = await Promise.all([
        journeyIds.length
          ? supabase
              .from("journey_updates")
              .select("created_at")
              .in("journey_id", journeyIds)
          : { data: [] },
        supabase
          .from("circle_checkins")
          .select("created_at")
          .eq("user_id", profileData.id),
      ]);

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

      const { data: respects } = postIds.length
        ? await supabase
            .from("respects")
            .select("user_id, target_id")
            .eq("target_type", "post")
            .in("target_id", postIds)
        : { data: [] };

      const respectCounts = new Map<string, number>();
      const respectedByMe = new Set<string>();

      respects?.forEach((respect) => {
        respectCounts.set(
          respect.target_id,
          (respectCounts.get(respect.target_id) ?? 0) + 1,
        );

        if (user && respect.user_id === user.id) {
          respectedByMe.add(respect.target_id);
        }
      });

      setFollowersCount(nextFollowersCount ?? 0);
      setFollowingCount(nextFollowingCount ?? 0);
      setJourneys(journeyRows);
      setMilestoneCounts(nextMilestoneCounts);
      setPosts(
        postsData?.map((post) => ({
          ...post,
          respect_count: respectCounts.get(post.id) ?? 0,
          respected_by_me: respectedByMe.has(post.id),
        })) ?? [],
      );
      setIsOwnProfile(isOwnProfileNext);
      const completedMilestones = (milestoneRows ?? []).filter(
        (milestone) => milestone.completed_at,
      ).length;
      const journeyStreak = calculateDailyStreak(
        updateRows?.map((update) => update.created_at) ?? [],
      );
      const circleCheckinStreak = calculateDailyStreak(
        checkinRows?.map((checkin) => checkin.created_at) ?? [],
      );

      setMomentum({
        journeyStreak,
        circleCheckinStreak,
        completedMilestones,
        updateCount: updateRows?.length ?? 0,
        badges: achievementLabels({
          journeyStreak,
          circleCheckinStreak,
          completedMilestones,
          updateCount: updateRows?.length ?? 0,
        }),
      });

      if (user && user.id !== profileData.id) {
        const { data: followData } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", profileData.id)
          .maybeSingle();

        setIsFollowing(Boolean(followData));
      } else {
        setIsFollowing(false);
      }

      setLoading(false);
    };

    void loadProfile();
  }, [username]);

  const handleFollowToggle = async () => {
    if (!profile || isOwnProfile) return;

    if (isFollowing) {
      const { error } = await unfollowUser(profile.id);
      if (error) {
        alert(error.message);
        return;
      }

      setIsFollowing(false);
      setFollowersCount((count) => Math.max(0, count - 1));
      return;
    }

    const { error } = await followUser(profile.id);
    if (error) {
      alert(error.message);
      return;
    }

    setIsFollowing(true);
    setFollowersCount((count) => count + 1);
  };

  const createPost = async () => {
    if (!profile) return;

    const trimmedPost = newPost.trim();

    if (!trimmedPost) {
      alert("Post text is required.");
      return;
    }

    setPosting(true);

    if (!currentUserId || currentUserId !== profile.id) {
      setPosting(false);
      alert("You can only post from your own profile.");
      return;
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: currentUserId,
        content: trimmedPost,
      })
      .select("id, user_id, content, created_at, updated_at")
      .single();

    if (error) {
      setPosting(false);
      alert(error.message);
      return;
    }

    setPosts((currentPosts) => [
      { ...data, respect_count: 0, respected_by_me: false },
      ...currentPosts,
    ]);
    setNewPost("");
    setPosting(false);
  };

  const updateSavedPost = (savedPost: Post) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === savedPost.id ? { ...post, ...savedPost } : post,
      ),
    );
  };
  const dailyCheckIns = posts.filter((post) => getCheckInFocus(post.content));

  if (loading) {
    return <main className="page-shell">Loading profile...</main>;
  }

  if (!profile) {
    return <main className="page-shell">Profile not found.</main>;
  }

  return (
    <main className="page-shell">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">{profile.display_name || "No Name"}</h1>
        <ProBadge tier={profile.subscription_tier} />
      </div>
      <p className="muted mt-1">@{profile.username}</p>
      <p className="mt-4">{profile.bio || "No bio yet"}</p>
      <div className="muted mt-4 flex gap-4 text-sm">
        <Link href={`/user/${profile.username}/followers`} className="font-semibold">
          {followersCount} {followersCount === 1 ? "follower" : "followers"}
        </Link>
        <Link href={`/user/${profile.username}/following`} className="font-semibold">
          {followingCount} following
        </Link>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="panel">
          <p className="muted text-xs font-semibold uppercase">Journey Streak</p>
          <p className="mt-1 text-2xl font-bold">
            {momentum.journeyStreak}{" "}
            {momentum.journeyStreak === 1 ? "day" : "days"}
          </p>
        </div>
        <div className="panel">
          <p className="muted text-xs font-semibold uppercase">
            Circle Check-Ins
          </p>
          <p className="mt-1 text-2xl font-bold">
            {momentum.circleCheckinStreak}{" "}
            {momentum.circleCheckinStreak === 1 ? "day" : "days"}
          </p>
        </div>
        <div className="panel">
          <p className="muted text-xs font-semibold uppercase">Achievements</p>
          {momentum.badges.length === 0 ? (
            <p className="muted mt-2 text-sm">No markers yet.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {momentum.badges.map((badge) => (
                <span key={badge} className="metric-pill">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {isOwnProfile && (
        <Link href="/settings/profile" className="btn-secondary mt-4 inline-block">
          Edit Profile
        </Link>
      )}

      {!isOwnProfile && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={handleFollowToggle} className="btn-primary">
            {isFollowing ? "Unfollow" : "Follow"}
          </button>
          {currentUserId && profile.username && (
            <Link
              href={`/messages?to=${encodeURIComponent(profile.username)}`}
              className="btn-secondary"
            >
              Message
            </Link>
          )}
        </div>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-heading">Journeys</h2>
          {isOwnProfile && (
            <Link href="/new-journey" className="text-sm font-semibold">
              New Journey
            </Link>
          )}
        </div>

        {journeys.length === 0 ? (
          <p className="muted panel">No journeys yet.</p>
        ) : (
          <div className="space-y-3">
            {journeys.map((journey) => (
              <Link
                key={journey.id}
                href={`/journey/${journey.id}`}
                className="link-panel"
              >
                <p className="font-semibold">{journey.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <JourneyStatusBadge status={journey.status} />
                  {isOwnProfile && (
                    <JourneyVisibilityBadge visibility={journey.visibility} />
                  )}
                  <MilestoneProgressBadge
                    completed={milestoneCounts[journey.id]?.completed ?? 0}
                    total={milestoneCounts[journey.id]?.total ?? 0}
                  />
                  {journey.category && (
                    <p className="muted text-sm">{journey.category}</p>
                  )}
                </div>
                {journey.goal_text && (
                  <p className="mt-2 text-sm">{journey.goal_text}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="section-heading mb-3">Posts</h2>

        {dailyCheckIns.length > 0 && (
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Recent Daily Check-Ins</h3>
              <span className="muted text-sm">{dailyCheckIns.length}</span>
            </div>
            <div className="space-y-3">
              {dailyCheckIns.slice(0, 3).map((post) => {
                const focus = getCheckInFocus(post.content);

                return (
                  <article key={post.id} className="panel">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {focus && <span className="metric-pill text-xs">{focus}</span>}
                      <time className="muted text-xs">
                        {post.created_at
                          ? new Date(post.created_at).toLocaleString()
                          : "Just now"}
                      </time>
                    </div>
                    <p className="text-sm">{post.content}</p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {isOwnProfile && (
          <div className="panel mb-4">
            <textarea
              value={newPost}
              onChange={(event) => setNewPost(event.target.value)}
              placeholder="What's your transformation today?"
              className="field h-24 resize-none"
            />
            <button
              onClick={createPost}
              disabled={posting}
              className="btn-primary mt-3"
            >
              {posting ? "Posting..." : "Post"}
            </button>
          </div>
        )}

        {posts.length === 0 ? (
          <p className="muted panel">No posts yet.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <EditablePostCard
                key={post.id}
                post={post}
                canEdit={isOwnProfile}
                currentUserId={currentUserId}
                onSaved={updateSavedPost}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
