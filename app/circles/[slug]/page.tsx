"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import JourneyStatusBadge from "@/components/JourneyStatusBadge";
import MilestoneProgressBadge from "@/components/MilestoneProgressBadge";
import RespectButton from "@/components/RespectButton";
import { joinCircle, leaveCircle } from "@/lib/circles";
import { supabase } from "@/lib/supabaseClient";
import { Circle, CircleCheckin, Journey, JourneyUpdate } from "@/types";

type CircleMemberProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type CircleJourney = Journey & {
  profile?: CircleMemberProfile;
  milestone_count: number;
  completed_milestone_count: number;
};

type CircleActivityUpdate = JourneyUpdate & {
  journey?: Pick<Journey, "id" | "title" | "category">;
  profile?: CircleMemberProfile;
  respect_count: number;
  respected_by_me: boolean;
};

type CircleCheckinWithProfile = CircleCheckin & {
  profile?: CircleMemberProfile;
};

const defaultCheckinPrompt = "What is one move you are making today?";

export default function CirclePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [circle, setCircle] = useState<Circle | null>(null);
  const [creator, setCreator] = useState<CircleMemberProfile | null>(null);
  const [members, setMembers] = useState<CircleMemberProfile[]>([]);
  const [journeys, setJourneys] = useState<CircleJourney[]>([]);
  const [checkins, setCheckins] = useState<CircleCheckinWithProfile[]>([]);
  const [activityUpdates, setActivityUpdates] = useState<CircleActivityUpdate[]>(
    [],
  );
  const [memberCount, setMemberCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [working, setWorking] = useState(false);
  const [editingCircle, setEditingCircle] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [circleCategory, setCircleCategory] = useState("");
  const [circleDescription, setCircleDescription] = useState("");
  const [circleCheckinPrompt, setCircleCheckinPrompt] = useState("");
  const [savingCircle, setSavingCircle] = useState(false);
  const [checkinBody, setCheckinBody] = useState("");
  const [postingCheckin, setPostingCheckin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCircle = async () => {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      const { data: circleData } = await supabase
        .from("circles")
        .select("*")
        .eq("slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      setCircle(circleData);
      setCreator(null);
      setMembers([]);
      setJourneys([]);
      setCheckins([]);
      setActivityUpdates([]);

      if (!circleData) {
        setLoading(false);
        return;
      }

      const [
        { data: memberRows },
        { count },
        { data: currentMembership },
        { data: circleJourneyRows },
        { data: creatorProfile },
        { data: checkinRows },
      ] = await Promise.all([
        supabase
          .from("circle_members")
          .select("user_id, created_at")
          .eq("circle_id", circleData.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("circle_members")
          .select("circle_id", { count: "exact", head: true })
          .eq("circle_id", circleData.id),
        user
          ? supabase
              .from("circle_members")
              .select("circle_id")
              .eq("circle_id", circleData.id)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("circle_journeys")
          .select("journey_id")
          .eq("circle_id", circleData.id)
          .limit(12),
        circleData.created_by
          ? supabase
              .from("profiles")
              .select("id, username, display_name")
              .eq("id", circleData.created_by)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("circle_checkins")
          .select("*")
          .eq("circle_id", circleData.id)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      const memberIds = memberRows?.map((member) => member.user_id) ?? [];
      const checkinUserIds = Array.from(
        new Set(checkinRows?.map((checkin) => checkin.user_id) ?? []),
      );
      const journeyIds =
        circleJourneyRows?.map((circleJourney) => circleJourney.journey_id) ??
        [];

      const [
        { data: profiles },
        { data: journeyRows },
        { data: checkinProfiles },
      ] = await Promise.all([
        memberIds.length
          ? supabase
              .from("profiles")
              .select("id, username, display_name")
              .in("id", memberIds)
          : Promise.resolve({ data: [] }),
        journeyIds.length
          ? supabase
              .from("journeys")
              .select("id, user_id, title, category, goal_text, status, visibility, archived_at, created_at, updated_at")
              .in("id", journeyIds)
              .eq("visibility", "public")
              .is("archived_at", null)
          : Promise.resolve({ data: [] }),
        checkinUserIds.length
          ? supabase
              .from("profiles")
              .select("id, username, display_name")
              .in("id", checkinUserIds)
          : Promise.resolve({ data: [] }),
      ]);

      const journeyUserIds = Array.from(
        new Set(journeyRows?.map((journey) => journey.user_id) ?? []),
      );
      const visibleJourneyIds = journeyRows?.map((journey) => journey.id) ?? [];

      const [
        { data: journeyProfiles },
        { data: milestoneRows },
        { data: updateRows },
      ] = await Promise.all([
          journeyUserIds.length
            ? supabase
                .from("profiles")
                .select("id, username, display_name")
                .in("id", journeyUserIds)
            : Promise.resolve({ data: [] }),
          visibleJourneyIds.length
            ? supabase
                .from("journey_milestones")
                .select("journey_id, completed_at")
                .in("journey_id", visibleJourneyIds)
            : Promise.resolve({ data: [] }),
          visibleJourneyIds.length
            ? supabase
                .from("journey_updates")
                .select("*")
                .in("journey_id", visibleJourneyIds)
                .order("created_at", { ascending: false })
                .limit(12)
            : Promise.resolve({ data: [] }),
        ]);

      const updateIds = updateRows?.map((update) => update.id) ?? [];
      const { data: respects } = updateIds.length
        ? await supabase
            .from("respects")
            .select("user_id, target_id")
            .eq("target_type", "journey_update")
            .in("target_id", updateIds)
        : { data: [] };

      const milestoneCounts = new Map<
        string,
        { completed: number; total: number }
      >();

      milestoneRows?.forEach((milestone) => {
        const counts = milestoneCounts.get(milestone.journey_id) ?? {
          completed: 0,
          total: 0,
        };

        counts.total += 1;
        if (milestone.completed_at) counts.completed += 1;
        milestoneCounts.set(milestone.journey_id, counts);
      });

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

      setMemberCount(count ?? 0);
      setIsJoined(Boolean(currentMembership));
      setCreator(
        creatorProfile
          ? {
              id: creatorProfile.id,
              username: creatorProfile.username,
              display_name: creatorProfile.display_name,
            }
          : null,
      );
      const nextMembers: CircleMemberProfile[] = [];

      memberRows?.forEach((member) => {
        const profile = profiles?.find(
          (currentProfile) => currentProfile.id === member.user_id,
        );

        if (profile) {
          nextMembers.push({
            id: profile.id,
            username: profile.username,
            display_name: profile.display_name,
          });
        }
      });

      setMembers(nextMembers);
      setCheckins(
        checkinRows?.map((checkin) => ({
          ...checkin,
          profile: checkinProfiles?.find(
            (profile) => profile.id === checkin.user_id,
          ),
        })) ?? [],
      );
      setJourneys(
        journeyRows?.map((journey) => {
          const counts = milestoneCounts.get(journey.id) ?? {
            completed: 0,
            total: 0,
          };

          return {
            ...journey,
            profile: journeyProfiles?.find(
              (profile) => profile.id === journey.user_id,
            ),
            milestone_count: counts.total,
            completed_milestone_count: counts.completed,
          };
        }) ?? [],
      );
      setActivityUpdates(
        updateRows?.map((update) => {
          const journey = journeyRows?.find(
            (currentJourney) => currentJourney.id === update.journey_id,
          );
          const profile = journeyProfiles?.find(
            (currentProfile) => currentProfile.id === update.user_id,
          );

          return {
            ...update,
            journey: journey
              ? {
                  id: journey.id,
                  title: journey.title,
                  category: journey.category,
                }
              : undefined,
            profile,
            respect_count: respectCounts.get(update.id) ?? 0,
            respected_by_me: respectedByMe.has(update.id),
          };
        }) ?? [],
      );
      setLoading(false);
    };

    void loadCircle();
  }, [slug]);

  const toggleMembership = async () => {
    if (!circle) return;

    if (!currentUserId) {
      alert("Log in to join circles.");
      return;
    }

    setWorking(true);

    const { error } = isJoined
      ? await leaveCircle(circle.id, currentUserId)
      : await joinCircle(circle.id, currentUserId);

    if (error) {
      setWorking(false);
      alert(error.message);
      return;
    }

    setIsJoined((current) => !current);
    setMemberCount((count) => Math.max(0, count + (isJoined ? -1 : 1)));
    setWorking(false);
  };

  const startEditingCircle = () => {
    if (!circle) return;

    setCircleName(circle.name);
    setCircleCategory(circle.category);
    setCircleDescription(circle.description);
    setCircleCheckinPrompt(circle.checkin_prompt);
    setEditingCircle(true);
  };

  const cancelEditingCircle = () => {
    setEditingCircle(false);
    setSavingCircle(false);
  };

  const saveCircle = async () => {
    if (!circle) return;

    const trimmedName = circleName.trim();
    const trimmedCheckinPrompt = circleCheckinPrompt.trim();

    if (!trimmedName) {
      alert("Circle name is required.");
      return;
    }

    if (!trimmedCheckinPrompt) {
      alert("Check-in prompt is required.");
      return;
    }

    setSavingCircle(true);

    const { data, error } = await supabase
      .from("circles")
      .update({
        name: trimmedName,
        category: circleCategory.trim(),
        description: circleDescription.trim(),
        checkin_prompt: trimmedCheckinPrompt,
      })
      .eq("id", circle.id)
      .select("*")
      .single();

    if (error) {
      setSavingCircle(false);
      alert(error.message);
      return;
    }

    setCircle(data);
    setEditingCircle(false);
    setSavingCircle(false);
  };

  const addCheckin = async () => {
    if (!circle) return;

    const trimmedBody = checkinBody.trim();

    if (!trimmedBody) {
      alert("Check-in text is required.");
      return;
    }

    if (!currentUserId) {
      alert("Log in to post a check-in.");
      return;
    }

    if (!isJoined) {
      alert("Join this Circle to post a check-in.");
      return;
    }

    setPostingCheckin(true);

    const { data, error } = await supabase
      .from("circle_checkins")
      .insert({
        circle_id: circle.id,
        user_id: currentUserId,
        prompt: circle.checkin_prompt || defaultCheckinPrompt,
        body: trimmedBody,
      })
      .select("*")
      .single();

    if (error) {
      setPostingCheckin(false);
      alert(error.message);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name")
      .eq("id", currentUserId)
      .maybeSingle();

    setCheckins((current) => [
      {
        ...data,
        profile: profile
          ? {
              id: profile.id,
              username: profile.username,
              display_name: profile.display_name,
            }
          : undefined,
      },
      ...current,
    ]);
    setCheckinBody("");
    setPostingCheckin(false);
  };

  const deleteOwnCheckin = async (checkin: CircleCheckin) => {
    const { error } = await supabase
      .from("circle_checkins")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", checkin.id);

    if (error) {
      alert(error.message);
      return;
    }

    setCheckins((current) =>
      current.filter((currentCheckin) => currentCheckin.id !== checkin.id),
    );
  };

  if (loading) {
    return <main className="wide-shell">Loading circle...</main>;
  }

  if (!circle) {
    return <main className="wide-shell">Circle not found.</main>;
  }

  const isCreator = Boolean(currentUserId && currentUserId === circle.created_by);

  return (
    <main className="wide-shell">
      <section className="mb-8">
        <Link href="/circles" className="muted text-sm font-semibold">
          Back to Circles
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{circle.name}</h1>
            {circle.category && (
              <p className="muted mt-1 text-sm">{circle.category}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {creator && (
                <p className="muted text-sm">
                  Created by{" "}
                  {creator.username ? (
                    <Link
                      href={`/user/${creator.username}`}
                      className="font-semibold"
                    >
                      @{creator.username}
                    </Link>
                  ) : (
                    <span className="font-semibold">
                      {creator.display_name || "a Megamorphosis member"}
                    </span>
                  )}
                </p>
              )}
              {isCreator && <span className="metric-pill text-xs">Admin</span>}
            </div>
          </div>

          {currentUserId && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleMembership}
                className={isJoined ? "btn-secondary" : "btn-primary"}
                disabled={working}
              >
                {isJoined ? "Joined" : "Join Circle"}
              </button>
              {isCreator && !editingCircle && (
                <button className="btn-secondary" onClick={startEditingCircle}>
                  Edit Circle
                </button>
              )}
            </div>
          )}
        </div>

        {circle.description && <p className="mt-4">{circle.description}</p>}

        {isCreator && editingCircle && (
          <div className="panel mt-4">
            <p className="muted mb-4 text-xs">
              Circle URL: /circles/{circle.slug}. URLs stay fixed after
              creation.
            </p>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Name</span>
              <input
                className="field"
                value={circleName}
                onChange={(event) => setCircleName(event.target.value)}
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-2 block text-sm font-semibold">Category</span>
              <input
                className="field"
                value={circleCategory}
                onChange={(event) => setCircleCategory(event.target.value)}
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-2 block text-sm font-semibold">
                Description
              </span>
              <textarea
                className="field h-24 resize-none"
                value={circleDescription}
                onChange={(event) => setCircleDescription(event.target.value)}
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-2 block text-sm font-semibold">
                Check-In Prompt
              </span>
              <input
                className="field"
                value={circleCheckinPrompt}
                onChange={(event) =>
                  setCircleCheckinPrompt(event.target.value)
                }
              />
              <p className="muted mt-2 text-xs">
                Members answer this when they post a Circle check-in.
              </p>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="btn-primary"
                disabled={savingCircle}
                onClick={saveCircle}
              >
                {savingCircle ? "Saving..." : "Save Circle"}
              </button>
              <button
                className="btn-secondary"
                disabled={savingCircle}
                onClick={cancelEditingCircle}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="muted mt-4 flex gap-3 text-sm">
          <span>
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </span>
          <span>
            {journeys.length} {journeys.length === 1 ? "journey" : "journeys"}
          </span>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="section-heading">Circle Check-Ins</h2>
          <span className="muted text-sm">Daily momentum</span>
        </div>

        <div className="panel mb-3">
          <p className="muted text-xs font-semibold uppercase">Prompt</p>
          <p className="mt-2 font-semibold">
            {circle.checkin_prompt || defaultCheckinPrompt}
          </p>

          {currentUserId ? (
            isJoined ? (
              <div className="mt-4">
                <textarea
                  className="field h-24 resize-none"
                  value={checkinBody}
                  onChange={(event) => setCheckinBody(event.target.value)}
                  placeholder="Share one concrete move, proof point, or next step."
                />
                <div className="mt-3 flex justify-end">
                  <button
                    className="btn-primary"
                    disabled={postingCheckin}
                    onClick={addCheckin}
                  >
                    {postingCheckin ? "Posting..." : "Post Check-In"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="muted mt-3 text-sm">
                Join this Circle to post check-ins.
              </p>
            )
          ) : (
            <p className="muted mt-3 text-sm">
              Log in to post check-ins with this Circle.
            </p>
          )}
        </div>

        {checkins.length === 0 ? (
          <p className="muted panel">
            No check-ins yet. Be the first to put a move on the board.
          </p>
        ) : (
          <div className="space-y-3">
            {checkins.map((checkin) => (
              <article key={checkin.id} className="panel">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="muted text-xs font-semibold uppercase">
                      {checkin.prompt}
                    </p>
                    <div className="muted mt-1 flex flex-wrap gap-2 text-xs">
                      {checkin.profile?.username && (
                        <Link
                          href={`/user/${checkin.profile.username}`}
                          className="font-semibold"
                        >
                          @{checkin.profile.username}
                        </Link>
                      )}
                      <time>
                        {new Date(checkin.created_at).toLocaleDateString()}
                      </time>
                    </div>
                  </div>

                  {currentUserId === checkin.user_id && (
                    <button
                      className="btn-secondary"
                      onClick={() => deleteOwnCheckin(checkin)}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p className="text-sm">{checkin.body}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="section-heading">Activity</h2>
          <span className="muted text-sm">Recent proof</span>
        </div>

        {activityUpdates.length === 0 ? (
          <p className="muted panel">
            No activity yet. Link public journeys here to start the feed.
          </p>
        ) : (
          <div className="space-y-3">
            {activityUpdates.map((update) => (
              <article key={update.id} className="panel">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    {update.journey && (
                      <Link
                        href={`/journey/${update.journey.id}`}
                        className="font-semibold"
                      >
                        {update.journey.title}
                      </Link>
                    )}
                    <div className="muted mt-1 flex flex-wrap gap-2 text-xs">
                      {update.profile?.username && (
                        <Link
                          href={`/user/${update.profile.username}`}
                          className="font-semibold"
                        >
                          @{update.profile.username}
                        </Link>
                      )}
                      {update.created_at && (
                        <time>
                          {new Date(update.created_at).toLocaleDateString()}
                        </time>
                      )}
                      {update.journey?.category && (
                        <span>{update.journey.category}</span>
                      )}
                    </div>
                  </div>

                  {(update.metric_label || update.metric_value) && (
                    <div className="metric-pill">
                      <span className="muted">
                        {update.metric_label || "Metric"}
                      </span>
                      {update.metric_value && (
                        <span className="ml-2 font-semibold">
                          {update.metric_value}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {update.text && <p className="text-sm">{update.text}</p>}

                {(update.reflection || update.mood || update.next_step) && (
                  <div className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-3">
                    {update.reflection && (
                      <div>
                        <p className="muted text-xs font-semibold uppercase">
                          Reflection
                        </p>
                        <p className="mt-2 text-sm">{update.reflection}</p>
                      </div>
                    )}
                    {update.mood && (
                      <div>
                        <p className="muted text-xs font-semibold uppercase">
                          Mood
                        </p>
                        <p className="mt-2 text-sm font-semibold capitalize">
                          {update.mood}
                        </p>
                      </div>
                    )}
                    {update.next_step && (
                      <div>
                        <p className="muted text-xs font-semibold uppercase">
                          Next Step
                        </p>
                        <p className="mt-2 text-sm">{update.next_step}</p>
                      </div>
                    )}
                  </div>
                )}

                {update.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={update.image_url}
                    alt=""
                    className="mt-3 max-h-96 w-full rounded-md object-cover"
                  />
                )}

                <div className="mt-3">
                  <RespectButton
                    targetId={update.id}
                    targetType="journey_update"
                    currentUserId={currentUserId}
                    initialCount={update.respect_count}
                    initiallyRespected={update.respected_by_me}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="section-heading mb-3">Linked Journeys</h2>

        {journeys.length === 0 ? (
          <p className="muted panel">
            No journeys linked yet. Journey attachment is coming next.
          </p>
        ) : (
          <div className="space-y-3">
            {journeys.map((journey) => (
              <article key={journey.id} className="panel">
                <Link href={`/journey/${journey.id}`} className="font-semibold">
                  {journey.title}
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <JourneyStatusBadge status={journey.status} />
                  <MilestoneProgressBadge
                    completed={journey.completed_milestone_count}
                    total={journey.milestone_count}
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

      <section>
        <h2 className="section-heading mb-3">Recent Members</h2>

        {members.length === 0 ? (
          <p className="muted panel">No members yet.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {members.map((member) => (
              <Link
                key={member.id}
                href={member.username ? `/user/${member.username}` : "/circles"}
                className="link-panel"
              >
                <p className="font-semibold">
                  {member.display_name || "No Name"}
                </p>
                <p className="muted mt-1 text-sm">@{member.username}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
