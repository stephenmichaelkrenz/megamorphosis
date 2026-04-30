"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DailyCheckInComposer from "@/components/DailyCheckInComposer";
import EditablePostCard from "@/components/EditablePostCard";
import JourneyStatusBadge from "@/components/JourneyStatusBadge";
import JourneyVisibilityBadge from "@/components/JourneyVisibilityBadge";
import MilestoneProgressBadge from "@/components/MilestoneProgressBadge";
import { achievementLabels, calculateDailyStreak } from "@/lib/gamification";
import { supabase } from "@/lib/supabaseClient";
import {
  Circle,
  CircleCheckin,
  Journey,
  JourneyMilestone,
  JourneyUpdate,
  Post,
} from "@/types";

type DashboardPost = Post & {
  respect_count: number;
  respected_by_me: boolean;
};

type DashboardProfile = {
  username: string | null;
  display_name: string | null;
};

type DashboardUpdate = Pick<
  JourneyUpdate,
  "id" | "journey_id" | "text" | "next_step" | "created_at"
>;

type DashboardCircle = Pick<
  Circle,
  "id" | "name" | "slug" | "category" | "description"
> & {
  member_count: number;
  activity_count: number;
};

type DashboardCheckin = CircleCheckin & {
  circle?: Pick<Circle, "id" | "name" | "slug">;
  profile?: {
    username: string | null;
    display_name: string | null;
  };
};

export default function Dashboard() {
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([]);
  const [latestUpdate, setLatestUpdate] = useState<DashboardUpdate | null>(null);
  const [circles, setCircles] = useState<DashboardCircle[]>([]);
  const [checkins, setCheckins] = useState<DashboardCheckin[]>([]);
  const [posts, setPosts] = useState<DashboardPost[]>([]);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [journeyStreak, setJourneyStreak] = useState(0);
  const [circleCheckinStreak, setCircleCheckinStreak] = useState(0);
  const [achievementBadges, setAchievementBadges] = useState<string[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      const [
        { data: profileData },
        { data: journeysData },
        { data: postsData },
        { data: membershipsData },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, display_name")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("journeys")
          .select("id, user_id, title, category, goal_text, status, visibility, archived_at, created_at, updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("posts")
          .select("id, user_id, content, created_at, updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("circle_members")
          .select("circle_id")
          .eq("user_id", user.id),
      ]);

      const journeyRows = journeysData ?? [];
      const joinedCircleIds =
        membershipsData?.map((membership) => membership.circle_id) ?? [];
      const activeJourneyRows = journeyRows.filter(
        (journey) => !journey.archived_at,
      );
      const activeJourneyIds = activeJourneyRows.map((journey) => journey.id);
      const journeyIds = journeyRows.map((journey) => journey.id);

      const [
        { data: milestoneData },
        { data: updateData },
        { data: circleRows },
        { data: circleMemberRows },
        { data: circleJourneyRows },
        { data: checkinRows },
        { data: ownCheckinRows },
        { data: allUpdateRows },
      ] = await Promise.all([
        journeyIds.length
          ? supabase
              .from("journey_milestones")
              .select("*")
              .in("journey_id", journeyIds)
          : { data: [] },
        activeJourneyIds.length
          ? supabase
              .from("journey_updates")
              .select("id, journey_id, text, next_step, created_at")
              .in("journey_id", activeJourneyIds)
              .order("created_at", { ascending: false })
              .limit(1)
          : { data: [] },
        joinedCircleIds.length
          ? supabase
              .from("circles")
              .select("id, name, slug, category, description")
              .in("id", joinedCircleIds)
              .order("created_at", { ascending: true })
          : { data: [] },
        joinedCircleIds.length
          ? supabase
              .from("circle_members")
              .select("circle_id")
              .in("circle_id", joinedCircleIds)
          : { data: [] },
        joinedCircleIds.length
          ? supabase
              .from("circle_journeys")
              .select("circle_id, journey_id")
              .in("circle_id", joinedCircleIds)
          : { data: [] },
        joinedCircleIds.length
          ? supabase
              .from("circle_checkins")
              .select("*")
              .in("circle_id", joinedCircleIds)
              .order("created_at", { ascending: false })
              .limit(6)
          : { data: [] },
        supabase
          .from("circle_checkins")
          .select("created_at")
          .eq("user_id", user.id),
        activeJourneyIds.length
          ? supabase
              .from("journey_updates")
              .select("created_at")
              .in("journey_id", activeJourneyIds)
          : { data: [] },
      ]);

      const checkinUserIds = Array.from(
        new Set(checkinRows?.map((checkin) => checkin.user_id) ?? []),
      );
      const circleJourneyIds = Array.from(
        new Set(circleJourneyRows?.map((link) => link.journey_id) ?? []),
      );

      const [
        { data: circleJourneyVisibilityRows },
        { data: circleUpdateRows },
        { data: checkinProfileRows },
      ] = await Promise.all([
          circleJourneyIds.length
            ? supabase
                .from("journeys")
                .select("id")
                .in("id", circleJourneyIds)
                .eq("visibility", "public")
                .is("archived_at", null)
            : { data: [] },
          circleJourneyIds.length
            ? supabase
                .from("journey_updates")
                .select("journey_id")
                .in("journey_id", circleJourneyIds)
            : { data: [] },
          checkinUserIds.length
            ? supabase
                .from("profiles")
                .select("id, username, display_name")
                .in("id", checkinUserIds)
            : { data: [] },
        ]);

      const postIds = postsData?.map((post) => post.id) ?? [];
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

        if (respect.user_id === user.id) {
          respectedByMe.add(respect.target_id);
        }
      });

      const circleMemberCounts = new Map<string, number>();
      const circleActivityCounts = new Map<string, number>();
      const visibleCircleJourneyIds = new Set(
        circleJourneyVisibilityRows?.map((journey) => journey.id) ?? [],
      );
      const circleIdsByJourneyId = new Map<string, string[]>();

      circleMemberRows?.forEach((membership) => {
        circleMemberCounts.set(
          membership.circle_id,
          (circleMemberCounts.get(membership.circle_id) ?? 0) + 1,
        );
      });

      circleJourneyRows?.forEach((link) => {
        if (!visibleCircleJourneyIds.has(link.journey_id)) return;

        circleIdsByJourneyId.set(link.journey_id, [
          ...(circleIdsByJourneyId.get(link.journey_id) ?? []),
          link.circle_id,
        ]);
      });

      circleUpdateRows?.forEach((update) => {
        if (!update.journey_id) return;

        const circleIds = circleIdsByJourneyId.get(update.journey_id) ?? [];

        circleIds.forEach((circleId) => {
          circleActivityCounts.set(
            circleId,
            (circleActivityCounts.get(circleId) ?? 0) + 1,
          );
        });
      });

      checkinRows?.forEach((checkin) => {
        circleActivityCounts.set(
          checkin.circle_id,
          (circleActivityCounts.get(checkin.circle_id) ?? 0) + 1,
        );
      });

      setProfile(profileData);
      setJourneys(journeyRows);
      setMilestones(milestoneData ?? []);
      setLatestUpdate(updateData?.[0] ?? null);
      setCircles(
        circleRows?.map((circle) => ({
          ...circle,
          member_count: circleMemberCounts.get(circle.id) ?? 0,
          activity_count: circleActivityCounts.get(circle.id) ?? 0,
        })) ?? [],
      );
      setCheckins(
        checkinRows?.map((checkin) => ({
          ...checkin,
          circle: circleRows?.find((circle) => circle.id === checkin.circle_id),
          profile: checkinProfileRows?.find(
            (profile) => profile.id === checkin.user_id,
          ),
        })) ?? [],
      );
      setPosts(
        postsData?.map((post) => ({
          ...post,
          respect_count: respectCounts.get(post.id) ?? 0,
          respected_by_me: respectedByMe.has(post.id),
        })) ?? [],
      );
      const nextJourneyStreak = calculateDailyStreak(
        allUpdateRows?.map((update) => update.created_at) ?? [],
      );
      const nextCircleCheckinStreak = calculateDailyStreak(
        ownCheckinRows?.map((checkin) => checkin.created_at) ?? [],
      );

      setJourneyStreak(nextJourneyStreak);
      setCircleCheckinStreak(nextCircleCheckinStreak);
      setAchievementBadges(
        achievementLabels({
          journeyStreak: nextJourneyStreak,
          circleCheckinStreak: nextCircleCheckinStreak,
          completedMilestones:
            (milestoneData ?? []).filter((milestone) => milestone.completed_at)
              .length,
          updateCount: allUpdateRows?.length ?? 0,
        }),
      );
      setLoading(false);
    };

    void fetchDashboard();
  }, []);

  const updateSavedPost = (savedPost: Post) => {
    setPosts((currentPosts) =>
      currentPosts.map((post) =>
        post.id === savedPost.id ? { ...post, ...savedPost } : post,
      ),
    );
  };

  const createPost = async () => {
    const trimmedPost = newPost.trim();

    if (!trimmedPost || !currentUserId) return;

    setPosting(true);

    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id: currentUserId,
        content: trimmedPost,
      })
      .select("id, user_id, content, created_at, updated_at")
      .single();

    if (error) {
      alert(error.message);
      setPosting(false);
      return;
    }

    setPosts((currentPosts) => [
      { ...data, respect_count: 0, respected_by_me: false },
      ...currentPosts,
    ]);
    setNewPost("");
    setPosting(false);
  };

  if (loading) {
    return <main className="wide-shell">Loading dashboard...</main>;
  }

  const activeJourneyCount = journeys.filter(
    (journey) => !journey.archived_at && journey.status === "active",
  ).length;
  const pausedJourneyCount = journeys.filter(
    (journey) => !journey.archived_at && journey.status === "paused",
  ).length;
  const completedJourneyCount = journeys.filter(
    (journey) => !journey.archived_at && journey.status === "completed",
  ).length;
  const visibleJourneys = journeys.filter((journey) => !journey.archived_at);
  const archivedJourneys = journeys.filter((journey) => journey.archived_at);
  const visibleJourneyIds = new Set(
    visibleJourneys.map((journey) => journey.id),
  );
  const visibleMilestones = milestones.filter((milestone) =>
    visibleJourneyIds.has(milestone.journey_id),
  );
  const completedMilestoneCount = visibleMilestones.filter(
    (milestone) => milestone.completed_at,
  ).length;
  const latestUpdateJourney = journeys.find(
    (journey) => journey.id === latestUpdate?.journey_id,
  );
  const getMilestoneCounts = (journeyId: string) => {
    const journeyMilestones = milestones.filter(
      (milestone) => milestone.journey_id === journeyId,
    );

    return {
      completed: journeyMilestones.filter((milestone) => milestone.completed_at)
        .length,
      total: journeyMilestones.length,
    };
  };

  return (
    <main className="wide-shell">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">
          {profile?.display_name ? `${profile.display_name}'s Dashboard` : "Dashboard"}
        </h1>
        <div className="mt-4 flex gap-3">
          <Link
            href="/new-journey"
            className="btn-primary"
          >
            New Journey
          </Link>
          <Link
            href={profile?.username ? `/user/${profile.username}` : "/onboarding"}
            className="btn-secondary"
          >
            View Profile
          </Link>
        </div>
      </section>

      <DailyCheckInComposer
        value={newPost}
        posting={posting}
        onChange={setNewPost}
        onSubmit={createPost}
      />

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="section-heading">My Circles</h2>
          <Link href="/circles" className="text-sm font-semibold">
            Explore Circles
          </Link>
        </div>

        {circles.length === 0 ? (
          <div className="panel">
            <p className="font-semibold">No Circles joined yet.</p>
            <p className="muted mt-2 text-sm">
              Find a community around the kind of transformation you are
              building.
            </p>
            <Link href="/circles" className="btn-secondary mt-4 inline-block">
              Browse Circles
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {circles.map((circle) => (
              <Link
                key={circle.id}
                href={`/circles/${circle.slug}`}
                className="link-panel"
              >
                <p className="font-semibold">{circle.name}</p>
                {circle.category && (
                  <p className="muted mt-1 text-sm">{circle.category}</p>
                )}
                {circle.description && (
                  <p className="mt-3 text-sm">{circle.description}</p>
                )}
                <div className="muted mt-3 flex flex-wrap gap-3 text-xs">
                  <span>
                    {circle.member_count}{" "}
                    {circle.member_count === 1 ? "member" : "members"}
                  </span>
                  <span>
                    {circle.activity_count} recent{" "}
                    {circle.activity_count === 1 ? "update" : "updates"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="section-heading">Circle Check-Ins</h2>
          <Link href="/circles" className="text-sm font-semibold">
            All Circles
          </Link>
        </div>

        {checkins.length === 0 ? (
          <p className="muted panel">
            No recent check-ins from your Circles yet.
          </p>
        ) : (
          <div className="space-y-3">
            {checkins.map((checkin) => (
              <Link
                key={checkin.id}
                href={
                  checkin.circle ? `/circles/${checkin.circle.slug}` : "/circles"
                }
                className="link-panel"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {checkin.circle?.name || "Circle check-in"}
                    </p>
                    <div className="muted mt-1 flex flex-wrap gap-2 text-xs">
                      {checkin.profile?.username && (
                        <span>@{checkin.profile.username}</span>
                      )}
                      <time>{new Date(checkin.created_at).toLocaleString()}</time>
                    </div>
                  </div>
                  <span className="metric-pill text-xs">Check-In</span>
                </div>
                <p className="muted mt-3 text-xs font-semibold uppercase">
                  {checkin.prompt}
                </p>
                <p className="mt-2 text-sm">{checkin.body}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-heading">Momentum</h2>
          <span className="muted text-sm">Today</span>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="panel">
            <p className="muted text-xs font-semibold uppercase">Active</p>
            <p className="mt-1 text-2xl font-bold">{activeJourneyCount}</p>
          </div>
          <div className="panel">
            <p className="muted text-xs font-semibold uppercase">Paused</p>
            <p className="mt-1 text-2xl font-bold">{pausedJourneyCount}</p>
          </div>
          <div className="panel">
            <p className="muted text-xs font-semibold uppercase">Completed</p>
            <p className="mt-1 text-2xl font-bold">{completedJourneyCount}</p>
          </div>
          <div className="panel">
            <p className="muted text-xs font-semibold uppercase">Milestones</p>
            <p className="mt-1 text-2xl font-bold">
              {completedMilestoneCount}/{visibleMilestones.length}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="panel">
            <p className="muted text-xs font-semibold uppercase">
              Latest Update
            </p>
            {latestUpdate && latestUpdateJourney ? (
              <Link
                href={`/journey/${latestUpdateJourney.id}`}
                className="mt-2 block"
              >
                <p className="font-semibold">{latestUpdateJourney.title}</p>
                <p className="mt-2 text-sm">{latestUpdate.text}</p>
                <time className="muted mt-3 block text-sm">
                  {latestUpdate.created_at
                    ? new Date(latestUpdate.created_at).toLocaleString()
                    : "Just now"}
                </time>
              </Link>
            ) : (
              <p className="muted mt-2 text-sm">No journey updates yet.</p>
            )}
          </div>

          <div className="panel">
            <p className="muted text-xs font-semibold uppercase">Next Step</p>
            {latestUpdate?.next_step && latestUpdateJourney ? (
              <Link
                href={`/journey/${latestUpdateJourney.id}`}
                className="mt-2 block"
              >
                <p className="font-semibold">{latestUpdate.next_step}</p>
                <p className="muted mt-2 text-sm">
                  From {latestUpdateJourney.title}
                </p>
              </Link>
            ) : (
              <p className="muted mt-2 text-sm">
                Add a next step to your latest journey update.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-heading">Streaks & Achievements</h2>
          <span className="muted text-sm">Lightweight momentum</span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="panel">
            <p className="muted text-xs font-semibold uppercase">
              Journey Streak
            </p>
            <p className="mt-1 text-2xl font-bold">
              {journeyStreak} {journeyStreak === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="panel">
            <p className="muted text-xs font-semibold uppercase">
              Circle Check-In Streak
            </p>
            <p className="mt-1 text-2xl font-bold">
              {circleCheckinStreak}{" "}
              {circleCheckinStreak === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="panel">
            <p className="muted text-xs font-semibold uppercase">
              Achievement Markers
            </p>
            {achievementBadges.length === 0 ? (
              <p className="muted mt-2 text-sm">
                Post an update or complete a milestone to unlock markers.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {achievementBadges.map((badge) => (
                  <span key={badge} className="metric-pill">
                    {badge}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-heading">Your Journeys</h2>
          <span className="muted text-sm">
            {visibleJourneys.length}{" "}
            {visibleJourneys.length === 1 ? "journey" : "journeys"}
          </span>
        </div>

        {visibleJourneys.length === 0 && (
          <p className="muted panel">No journeys yet. Start one when ready.</p>
        )}

        <div className="space-y-3">
          {visibleJourneys.map((journey) => (
            <Link
              key={journey.id}
              href={`/journey/${journey.id}`}
              className="link-panel"
            >
              <p className="font-semibold">{journey.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <JourneyStatusBadge status={journey.status} />
                <JourneyVisibilityBadge visibility={journey.visibility} />
                <MilestoneProgressBadge {...getMilestoneCounts(journey.id)} />
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
      </section>

      {archivedJourneys.length > 0 && (
        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-heading">Archived Journeys</h2>
            <span className="muted text-sm">{archivedJourneys.length}</span>
          </div>

          <div className="space-y-3">
            {archivedJourneys.map((journey) => (
              <Link
                key={journey.id}
                href={`/journey/${journey.id}`}
                className="link-panel"
              >
                <p className="font-semibold">{journey.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="metric-pill">
                    <span className="muted">State</span>
                    <span className="ml-2 font-semibold">Archived</span>
                  </span>
                  <JourneyVisibilityBadge visibility={journey.visibility} />
                  <MilestoneProgressBadge {...getMilestoneCounts(journey.id)} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-heading">Recent Posts</h2>
          <Link href="/" className="text-sm font-semibold">
            Feed
          </Link>
        </div>

        {posts.length === 0 ? (
          <p className="muted panel">No posts yet.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <EditablePostCard
                key={post.id}
                post={post}
                canEdit
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
