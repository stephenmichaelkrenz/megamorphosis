"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DailyCheckInComposer from "@/components/DailyCheckInComposer";
import EditablePostCard from "@/components/EditablePostCard";
import TodayModule from "@/components/TodayModule";
import { calculateDailyStreak } from "@/lib/gamification";
import { supabase } from "@/lib/supabaseClient";
import {
  emptyTodaySummary,
  getTodayStartIso,
} from "@/lib/today";
import type { TodaySummary } from "@/lib/today";
import { Post } from "@/types";

type FeedPost = {
  id: string;
  user_id: string | null;
  content: string | null;
  created_at: string | null;
  updated_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
  };
  respect_count: number;
  respected_by_me: boolean;
  comment_count: number;
};

type PublicJourneyPreview = {
  id: string;
  title: string;
  category: string | null;
  goal_text: string | null;
  created_at: string | null;
  profile?: {
    username: string | null;
    display_name: string | null;
  };
  update_count: number;
  respect_count: number;
};

export default function HomePage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [publicJourneys, setPublicJourneys] = useState<PublicJourneyPreview[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [todaySummary, setTodaySummary] =
    useState<TodaySummary>(emptyTodaySummary);

  const fetchFeed = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { posts: [], userId: null, username: null };
    }

    const [{ data: follows }, { data: currentProfile }] = await Promise.all([
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id),
      supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    const followingIds = follows?.map((follow) => follow.following_id) ?? [];
    const visibleUserIds = Array.from(new Set([user.id, ...followingIds]));

    const { data: postsData } = await supabase
      .from("posts")
      .select("id, user_id, content, created_at, updated_at")
      .in("user_id", visibleUserIds)
      .order("created_at", { ascending: false });

    const postIds = postsData?.map((post) => post.id) ?? [];
    const postUserIds = Array.from(
      new Set(
        postsData
          ?.map((post) => post.user_id)
          .filter((userId): userId is string => Boolean(userId)) ?? [],
      ),
    );

    const [{ data: profiles }, { data: respects }, { data: comments }] =
      await Promise.all([
        postUserIds.length
          ? supabase
              .from("profiles")
              .select("id, username, display_name")
              .in("id", postUserIds)
          : Promise.resolve({ data: [] }),
        postIds.length
          ? supabase
              .from("respects")
              .select("user_id, target_id")
              .eq("target_type", "post")
              .in("target_id", postIds)
          : Promise.resolve({ data: [] }),
        postIds.length
          ? supabase
              .from("post_comments")
              .select("post_id")
              .in("post_id", postIds)
              .is("deleted_at", null)
              .is("hidden_at", null)
          : Promise.resolve({ data: [] }),
      ]);

    const respectCounts = new Map<string, number>();
    const respectedByMe = new Set<string>();
    const commentCounts = new Map<string, number>();

    respects?.forEach((respect) => {
      respectCounts.set(
        respect.target_id,
        (respectCounts.get(respect.target_id) ?? 0) + 1,
      );

      if (respect.user_id === user.id) {
        respectedByMe.add(respect.target_id);
      }
    });

    comments?.forEach((comment) => {
      commentCounts.set(
        comment.post_id,
        (commentCounts.get(comment.post_id) ?? 0) + 1,
      );
    });

    return {
      posts:
        postsData?.map((post) => ({
          ...post,
          profile: profiles?.find((profile) => profile.id === post.user_id),
          respect_count: respectCounts.get(post.id) ?? 0,
          respected_by_me: respectedByMe.has(post.id),
          comment_count: commentCounts.get(post.id) ?? 0,
        })) ?? [],
      userId: user.id,
      username: currentProfile?.username ?? null,
    };
  };

  const fetchPublicJourneys = async () => {
    const { data: journeysData } = await supabase
      .from("journeys")
      .select("id, user_id, title, category, goal_text, created_at")
      .eq("visibility", "public")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(6);

    const journeyIds = journeysData?.map((journey) => journey.id) ?? [];
    const journeyUserIds = Array.from(
      new Set(
        journeysData
          ?.map((journey) => journey.user_id)
          .filter((userId): userId is string => Boolean(userId)) ?? [],
      ),
    );

    const [{ data: profiles }, { data: updates }] = await Promise.all([
      journeyUserIds.length
        ? supabase
            .from("profiles")
            .select("id, username, display_name")
            .in("id", journeyUserIds)
        : Promise.resolve({ data: [] }),
      journeyIds.length
        ? supabase
            .from("journey_updates")
            .select("id, journey_id")
            .in("journey_id", journeyIds)
        : Promise.resolve({ data: [] }),
    ]);

    const updateIds = updates?.map((update) => update.id) ?? [];
    const { data: respects } = updateIds.length
      ? await supabase
          .from("respects")
          .select("target_id")
          .eq("target_type", "journey_update")
          .in("target_id", updateIds)
      : { data: [] };

    const updateJourneyIds = new Map(
      updates?.map((update) => [update.id, update.journey_id]) ?? [],
    );

    const respectCounts = new Map<string, number>();
    respects?.forEach((respect) => {
      const journeyId = updateJourneyIds.get(respect.target_id);
      if (!journeyId) return;
      respectCounts.set(journeyId, (respectCounts.get(journeyId) ?? 0) + 1);
    });

    const updateCounts = new Map<string, number>();
    updates?.forEach((update) => {
      if (!update.journey_id) return;
      updateCounts.set(
        update.journey_id,
        (updateCounts.get(update.journey_id) ?? 0) + 1,
      );
    });

    return (
      journeysData
        ?.map((journey) => ({
          id: journey.id,
          title: journey.title,
          category: journey.category,
          goal_text: journey.goal_text,
          created_at: journey.created_at,
          profile: profiles?.find((profile) => profile.id === journey.user_id),
          update_count: updateCounts.get(journey.id) ?? 0,
          respect_count: respectCounts.get(journey.id) ?? 0,
        }))
        .sort((a, b) => {
          if (b.update_count !== a.update_count) {
            return b.update_count - a.update_count;
          }

          return (
            new Date(b.created_at ?? 0).getTime() -
            new Date(a.created_at ?? 0).getTime()
          );
        })
        .slice(0, 3) ?? []
    );
  };

  const fetchTodaySummary = async (): Promise<TodaySummary> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return emptyTodaySummary;

    const todayStartIso = getTodayStartIso();

    const [
      { count: todayPostCount },
      { data: activeJourneys },
      { count: joinedCircleCount },
      { data: ownCheckins },
      { count: unreadNotificationCount },
      { count: unreadMessageCount },
    ] = await Promise.all([
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", todayStartIso),
      supabase
        .from("journeys")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("status", "active")
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("circle_members")
        .select("circle_id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("circle_checkins")
        .select("created_at")
        .eq("user_id", user.id),
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

    const activeJourneyIds = activeJourneys?.map((journey) => journey.id) ?? [];
    const { data: journeyUpdates } = activeJourneyIds.length
      ? await supabase
          .from("journey_updates")
          .select("journey_id, created_at")
          .in("journey_id", activeJourneyIds)
      : { data: [] };

    const latestUpdateByJourneyId = new Map<string, string | null>();
    journeyUpdates?.forEach((update) => {
      if (!update.journey_id) return;

      const currentLatest = latestUpdateByJourneyId.get(update.journey_id);
      if (
        !currentLatest ||
        new Date(update.created_at ?? 0).getTime() >
          new Date(currentLatest).getTime()
      ) {
        latestUpdateByJourneyId.set(update.journey_id, update.created_at);
      }
    });

    const journeyPrompt =
      activeJourneys
        ?.map((journey) => ({
          id: journey.id,
          title: journey.title,
          lastUpdatedAt: latestUpdateByJourneyId.get(journey.id) ?? null,
        }))
        .sort((a, b) => {
          if (!a.lastUpdatedAt && b.lastUpdatedAt) return -1;
          if (a.lastUpdatedAt && !b.lastUpdatedAt) return 1;
          return (
            new Date(a.lastUpdatedAt ?? 0).getTime() -
            new Date(b.lastUpdatedAt ?? 0).getTime()
          );
        })[0] ?? null;

    return {
      hasCheckedInToday: (todayPostCount ?? 0) > 0,
      journeyPrompt,
      joinedCircleCount: joinedCircleCount ?? 0,
      circleCheckinStreak: calculateDailyStreak(
        ownCheckins?.map((checkin) => checkin.created_at) ?? [],
      ),
      unreadNotificationCount: unreadNotificationCount ?? 0,
      unreadMessageCount: unreadMessageCount ?? 0,
    };
  };

  useEffect(() => {
    const loadInitialFeed = async () => {
      const [nextFeed, nextPublicJourneys, nextTodaySummary] = await Promise.all([
        fetchFeed(),
        fetchPublicJourneys(),
        fetchTodaySummary(),
      ]);
      setPosts(nextFeed.posts);
      setPublicJourneys(nextPublicJourneys);
      setCurrentUserId(nextFeed.userId);
      setCurrentUsername(nextFeed.username);
      setTodaySummary(nextTodaySummary);
      setLoading(false);
    };

    void loadInitialFeed();
  }, []);

  const createPost = async (content = newPost) => {
    const trimmedContent = content.trim();

    if (!trimmedContent) return;

    setPosting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to post.");
      setPosting(false);
      return;
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: trimmedContent,
    });

    if (error) {
      alert(error.message);
      setPosting(false);
      return;
    }

    setNewPost("");
    setTodaySummary((summary) => ({ ...summary, hasCheckedInToday: true }));
    setLoading(true);
    const nextFeed = await fetchFeed();
    setPosts(nextFeed.posts);
    setCurrentUserId(nextFeed.userId);
    setCurrentUsername(nextFeed.username);
    setLoading(false);
    setPosting(false);
  };

  const updateSavedPost = (savedPost: Post) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === savedPost.id ? { ...post, ...savedPost } : post,
      ),
    );
  };

  const formatCount = (count: number, singular: string, plural = `${singular}s`) =>
    `${count} ${count === 1 ? singular : plural}`;

  return (
    <main className="page-shell">
      <section className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-normal sm:text-5xl">
          MEGAMORPHOSIS
        </h1>
        <p className="muted mt-4 text-lg">Track your transformation.</p>

        {!loading && (
          <div className="mobile-stack-actions mt-6 flex justify-center gap-3">
            {currentUsername ? (
              <>
                <Link href="/dashboard" className="btn-primary">
                  Dashboard
                </Link>
                <Link href="/new-journey" className="btn-secondary">
                  New Journey
                </Link>
                <Link href="/circles" className="btn-secondary">
                  Circles
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signup" className="btn-primary">
                  Start Your Journey
                </Link>
                <Link href="/auth/login" className="btn-secondary">
                  Log In
                </Link>
                <Link href="/circles" className="btn-secondary">
                  Explore Circles
                </Link>
              </>
            )}
          </div>
        )}

        <div className="panel mt-6">
          <strong>Build visible momentum through proof, support, and reflection.</strong>
        </div>
      </section>

      {loading ? (
        <section className="panel mb-8">
          <p className="muted text-sm">Finding public progress...</p>
        </section>
      ) : currentUserId ? (
        <>
          <TodayModule summary={todaySummary} />
          <DailyCheckInComposer
            value={newPost}
            posting={posting}
            onChange={setNewPost}
            onSubmit={createPost}
          />
        </>
      ) : (
        <section className="panel mb-8">
          <h2 className="mb-2 text-lg font-semibold">Ready to document progress?</h2>
          <p className="muted text-sm">
            Create an account to post proof, start a journey, join Circles, and
            follow people building alongside you.
          </p>
          <Link href="/auth/signup" className="btn-primary mt-4 inline-block">
            Start Your Journey
          </Link>
        </section>
      )}

      {currentUserId ? (
        <section>
          <h2 className="mb-4 text-2xl font-bold">Your Feed</h2>

          {loading && <p>Loading feed...</p>}

          {!loading && posts.length === 0 && (
            <div className="panel">
              <p className="font-semibold">No posts yet.</p>
              <p className="muted mt-2 text-sm">
                Follow people, join Circles, or create your first post.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {posts.map((post) => {
              const username = post.profile?.username;

              return (
                <EditablePostCard
                  key={post.id}
                  post={post}
                  canEdit={post.user_id === currentUserId}
                  currentUserId={currentUserId}
                  onSaved={updateSavedPost}
                  header={
                    <p className="mb-2 font-semibold">
                      {username ? (
                        <Link href={`/user/${username}`}>@{username}</Link>
                      ) : (
                        "@unknown"
                      )}
                    </p>
                  }
                />
              );
            })}
          </div>
        </section>
      ) : (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Recent Journeys</h2>
              <p className="muted mt-1 text-sm">
                See what people are already building in public.
              </p>
            </div>
            <Link href="/discover" className="font-semibold">
              Discover more
            </Link>
          </div>

          {loading ? (
            <p>Loading journeys...</p>
          ) : publicJourneys.length === 0 ? (
            <div className="panel">
              <p className="font-semibold">The first journeys are coming online.</p>
              <p className="muted mt-2 text-sm">
                Start yours and help set the tone for the community.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {publicJourneys.map((journey) => {
                const username = journey.profile?.username;
                const displayName =
                  journey.profile?.display_name || username || "Someone";

                return (
                  <article key={journey.id} className="link-panel">
                    <Link href={`/journey/${journey.id}`} className="block">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="metric-pill">
                          {formatCount(journey.update_count, "update")}
                        </span>
                        <span className="metric-pill">
                          {formatCount(journey.respect_count, "respect")}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold">{journey.title}</h3>
                      <p className="muted mt-1 text-sm">
                        {journey.category || "Transformation"} by{" "}
                        {username ? `@${username}` : displayName}
                      </p>
                      {journey.goal_text && (
                        <p className="mt-3 text-sm leading-6">
                          {journey.goal_text}
                        </p>
                      )}
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
