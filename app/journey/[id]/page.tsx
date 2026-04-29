"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import JourneyUpdateComments from "@/components/JourneyUpdateComments";
import JourneyStatusBadge from "@/components/JourneyStatusBadge";
import JourneyVisibilityBadge from "@/components/JourneyVisibilityBadge";
import RespectButton from "@/components/RespectButton";
import {
  attachJourneyToCircle,
  detachJourneyFromCircle,
} from "@/lib/circles";
import { supabase } from "@/lib/supabaseClient";
import UploadUpdateForm from "@/components/UploadUpdateForm";
import {
  Circle,
  Journey,
  JourneyMilestone,
  JourneyStatus,
  JourneyVisibility,
  JourneyUpdate,
} from "@/types";

type JourneyUpdateWithRespect = JourneyUpdate & {
  respect_count: number;
  respected_by_me: boolean;
  comment_count: number;
  recent_commenters: string[];
  recent_supporters: string[];
};

type JourneyCircle = Pick<
  Circle,
  "id" | "name" | "slug" | "category" | "description"
>;

type ProfileSummary = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type Notice = {
  type: "error" | "success";
  message: string;
};

const profileLabel = (profile?: ProfileSummary) =>
  profile?.display_name || (profile?.username ? `@${profile.username}` : "Someone");

const commentActionLabel = (commentCount: number) => {
  if (commentCount === 0) return "Comment";
  if (commentCount === 1) return "1 Comment";
  return `${commentCount} Comments`;
};

export default function JourneyPage() {
  const params = useParams<{ id: string }>();
  const journeyId = params.id;
  const [journey, setJourney] = useState<Journey | null>(null);
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([]);
  const [updates, setUpdates] = useState<JourneyUpdateWithRespect[]>([]);
  const [availableCircles, setAvailableCircles] = useState<JourneyCircle[]>([]);
  const [linkedCircleIds, setLinkedCircleIds] = useState<Set<string>>(new Set());
  const [savingCircleId, setSavingCircleId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneTargetDate, setMilestoneTargetDate] = useState("");
  const [savingMilestone, setSavingMilestone] = useState(false);
  const [editingJourney, setEditingJourney] = useState(false);
  const [journeyTitle, setJourneyTitle] = useState("");
  const [journeyCategory, setJourneyCategory] = useState("");
  const [journeyGoalText, setJourneyGoalText] = useState("");
  const [journeyStatus, setJourneyStatus] = useState<JourneyStatus>("active");
  const [journeyVisibility, setJourneyVisibility] =
    useState<JourneyVisibility>("public");
  const [savingJourney, setSavingJourney] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
  const [updateText, setUpdateText] = useState("");
  const [updateMetricLabel, setUpdateMetricLabel] = useState("");
  const [updateMetricValue, setUpdateMetricValue] = useState("");
  const [updateReflection, setUpdateReflection] = useState("");
  const [updateMood, setUpdateMood] = useState("");
  const [updateNextStep, setUpdateNextStep] = useState("");
  const [updateImageUrl, setUpdateImageUrl] = useState("");
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const fetchJourneyData = useCallback(async () => {
    const [
      { data: journeyData },
      { data: milestoneData },
      { data: updatesData, error },
      { data: circleLinks },
      { data: circlesData },
      {
        data: { user },
      },
    ] =
      await Promise.all([
        supabase
          .from("journeys")
          .select("id, user_id, title, category, goal_text, status, visibility, archived_at, created_at, updated_at")
          .eq("id", journeyId)
          .maybeSingle(),
        supabase
          .from("journey_milestones")
          .select("*")
          .eq("journey_id", journeyId)
          .order("completed_at", { ascending: true, nullsFirst: true })
          .order("target_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: true }),
        supabase
          .from("journey_updates")
          .select("*")
          .eq("journey_id", journeyId)
          .order("created_at", { ascending: false }),
        supabase
          .from("circle_journeys")
          .select("circle_id")
          .eq("journey_id", journeyId),
        supabase
          .from("circles")
          .select("id, name, slug, category, description")
          .eq("is_public", true)
          .order("created_at", { ascending: true }),
        supabase.auth.getUser(),
      ]);

    const updateIds = updatesData?.map((update) => update.id) ?? [];
    const { data: respects } = updateIds.length
      ? await supabase
          .from("respects")
          .select("user_id, target_id")
          .eq("target_type", "journey_update")
          .in("target_id", updateIds)
      : { data: [] };
    const { data: comments } = updateIds.length
      ? await supabase
          .from("journey_update_comments")
          .select("journey_update_id, user_id, created_at")
          .in("journey_update_id", updateIds)
          .is("deleted_at", null)
          .is("hidden_at", null)
          .order("created_at", { ascending: false })
      : { data: [] };

    const respectCounts = new Map<string, number>();
    const respectedByMe = new Set<string>();
    const supporterIdsByUpdate = new Map<string, string[]>();
    const commentCounts = new Map<string, number>();
    const commenterIdsByUpdate = new Map<string, string[]>();

    respects?.forEach((respect) => {
      respectCounts.set(
        respect.target_id,
        (respectCounts.get(respect.target_id) ?? 0) + 1,
      );
      supporterIdsByUpdate.set(respect.target_id, [
        ...(supporterIdsByUpdate.get(respect.target_id) ?? []),
        respect.user_id,
      ]);

      if (user && respect.user_id === user.id) {
        respectedByMe.add(respect.target_id);
      }
    });

    comments?.forEach((comment) => {
      if (!comment.journey_update_id || !comment.user_id) return;

      commentCounts.set(
        comment.journey_update_id,
        (commentCounts.get(comment.journey_update_id) ?? 0) + 1,
      );
      commenterIdsByUpdate.set(comment.journey_update_id, [
        ...(commenterIdsByUpdate.get(comment.journey_update_id) ?? []),
        comment.user_id,
      ]);
    });

    const profileIds = Array.from(
      new Set([
        ...Array.from(supporterIdsByUpdate.values()).flat(),
        ...Array.from(commenterIdsByUpdate.values()).flat(),
      ]),
    );
    const { data: profileRows } = profileIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", profileIds)
      : { data: [] };
    const profilesById = Object.fromEntries(
      ((profileRows ?? []) as ProfileSummary[]).map((profile) => [
        profile.id,
        profile,
      ]),
    );

    return {
      journeyData,
      milestoneData: milestoneData ?? [],
      circleLinks: circleLinks ?? [],
      circlesData: circlesData ?? [],
      updatesData: error
        ? null
        : updatesData?.map((update) => ({
            ...update,
            respect_count: respectCounts.get(update.id) ?? 0,
            respected_by_me: respectedByMe.has(update.id),
            comment_count: commentCounts.get(update.id) ?? 0,
            recent_commenters: [
              ...new Set(commenterIdsByUpdate.get(update.id) ?? []),
            ]
              .slice(0, 3)
              .map((profileId) => profileLabel(profilesById[profileId])),
            recent_supporters: [
              ...new Set(supporterIdsByUpdate.get(update.id) ?? []),
            ]
              .slice(0, 3)
              .map((profileId) => profileLabel(profilesById[profileId])),
          })) ?? [],
      currentUserId: user?.id ?? null,
      isOwner: Boolean(user && journeyData?.user_id === user.id),
    };
  }, [journeyId]);

  const refreshJourney = useCallback(async () => {
    setLoading(true);
    const {
      journeyData,
      milestoneData,
      updatesData,
      circleLinks,
      circlesData,
      currentUserId: nextCurrentUserId,
      isOwner: nextIsOwner,
    } = await fetchJourneyData();
    setJourney(journeyData);
    setMilestones(milestoneData);
    if (updatesData) setUpdates(updatesData);
    setAvailableCircles(circlesData);
    setLinkedCircleIds(
      new Set(circleLinks.map((circleLink) => circleLink.circle_id)),
    );
    setCurrentUserId(nextCurrentUserId);
    setIsOwner(nextIsOwner);
    setLoading(false);
  }, [fetchJourneyData]);

  useEffect(() => {
    const loadInitialJourney = async () => {
      const {
        journeyData,
        milestoneData,
        updatesData,
        circleLinks,
        circlesData,
        currentUserId: nextCurrentUserId,
        isOwner: nextIsOwner,
      } = await fetchJourneyData();
      setJourney(journeyData);
      setMilestones(milestoneData);
      if (updatesData) setUpdates(updatesData);
      setAvailableCircles(circlesData);
      setLinkedCircleIds(
        new Set(circleLinks.map((circleLink) => circleLink.circle_id)),
      );
      setCurrentUserId(nextCurrentUserId);
      setIsOwner(nextIsOwner);
      setLoading(false);
    };

    void loadInitialJourney();
  }, [fetchJourneyData]);

  const addMilestone = async () => {
    const trimmedTitle = milestoneTitle.trim();

    if (!trimmedTitle) {
      setNotice({ type: "error", message: "Milestone title is required." });
      return;
    }

    setSavingMilestone(true);
    setNotice(null);

    if (!currentUserId) {
      setSavingMilestone(false);
      setNotice({
        type: "error",
        message: "You must be logged in to add milestones.",
      });
      return;
    }

    const { error } = await supabase.from("journey_milestones").insert({
      journey_id: journeyId,
      user_id: currentUserId,
      title: trimmedTitle,
      target_date: milestoneTargetDate || null,
    });

    if (error) {
      setSavingMilestone(false);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setMilestoneTitle("");
    setMilestoneTargetDate("");
    setSavingMilestone(false);
    await refreshJourney();
    setNotice({ type: "success", message: "Milestone added." });
  };

  const toggleMilestone = async (milestone: JourneyMilestone) => {
    const { error } = await supabase
      .from("journey_milestones")
      .update({
        completed_at: milestone.completed_at ? null : new Date().toISOString(),
      })
      .eq("id", milestone.id);

    if (error) {
      setNotice({ type: "error", message: error.message });
      return;
    }

    await refreshJourney();
    setNotice({
      type: "success",
      message: milestone.completed_at ? "Milestone reopened." : "Milestone completed.",
    });
  };

  const startEditingJourney = () => {
    if (!journey) return;

    setJourneyTitle(journey.title);
    setJourneyCategory(journey.category ?? "");
    setJourneyGoalText(journey.goal_text ?? "");
    setJourneyStatus(
      journey.status === "paused" || journey.status === "completed"
        ? journey.status
        : "active",
    );
    setJourneyVisibility(
      journey.visibility === "unlisted" || journey.visibility === "private"
        ? journey.visibility
        : "public",
    );
    setEditingJourney(true);
  };

  const cancelEditingJourney = () => {
    setEditingJourney(false);
    setSavingJourney(false);
  };

  const saveJourney = async () => {
    const trimmedTitle = journeyTitle.trim();

    if (!trimmedTitle) {
      setNotice({ type: "error", message: "Journey title is required." });
      return;
    }

    setSavingJourney(true);
    setNotice(null);

    const { error } = await supabase
      .from("journeys")
      .update({
        title: trimmedTitle,
        category: journeyCategory.trim() || null,
        goal_text: journeyGoalText.trim() || null,
        status: journeyStatus,
        visibility: journeyVisibility,
      })
      .eq("id", journeyId);

    if (error) {
      setSavingJourney(false);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setEditingJourney(false);
    setSavingJourney(false);
    await refreshJourney();
    setNotice({ type: "success", message: "Journey saved." });
  };

  const toggleCircleLink = async (circle: JourneyCircle) => {
    if (!journey || !currentUserId || !isOwner) return;

    if (journey.visibility !== "public") {
      setNotice({
        type: "error",
        message: "Only public journeys can be linked to Circles.",
      });
      return;
    }

    const isLinked = linkedCircleIds.has(circle.id);
    setSavingCircleId(circle.id);
    setNotice(null);

    const { error } = isLinked
      ? await detachJourneyFromCircle({
          circleId: circle.id,
          journeyId,
        })
      : await attachJourneyToCircle({
          circleId: circle.id,
          journeyId,
          currentUserId,
        });

    if (error) {
      setSavingCircleId(null);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setLinkedCircleIds((current) => {
      const next = new Set(current);

      if (isLinked) {
        next.delete(circle.id);
      } else {
        next.add(circle.id);
      }

      return next;
    });
    setSavingCircleId(null);
    setNotice({
      type: "success",
      message: isLinked
        ? `Removed from ${circle.name}.`
        : `Attached to ${circle.name}.`,
    });
  };

  const toggleArchiveJourney = async () => {
    if (!journey || !isOwner) return;

    const { error } = await supabase
      .from("journeys")
      .update({
        archived_at: journey.archived_at ? null : new Date().toISOString(),
      })
      .eq("id", journeyId);

    if (error) {
      setNotice({ type: "error", message: error.message });
      return;
    }

    await refreshJourney();
    setNotice({
      type: "success",
      message: journey.archived_at ? "Journey restored." : "Journey archived.",
    });
  };

  const startEditingUpdate = (update: JourneyUpdateWithRespect) => {
    setEditingUpdateId(update.id);
    setUpdateText(update.text ?? "");
    setUpdateMetricLabel(update.metric_label ?? "");
    setUpdateMetricValue(update.metric_value ?? "");
    setUpdateReflection(update.reflection ?? "");
    setUpdateMood(update.mood ?? "");
    setUpdateNextStep(update.next_step ?? "");
    setUpdateImageUrl(update.image_url ?? "");
  };

  const cancelEditingUpdate = () => {
    setEditingUpdateId(null);
    setSavingUpdate(false);
  };

  const saveUpdate = async (updateId: string) => {
    const trimmedText = updateText.trim();

    if (!trimmedText) {
      setNotice({ type: "error", message: "Update text is required." });
      return;
    }

    setSavingUpdate(true);
    setNotice(null);

    const { error } = await supabase
      .from("journey_updates")
      .update({
        text: trimmedText,
        metric_label: updateMetricLabel.trim() || null,
        metric_value: updateMetricValue.trim() || null,
        reflection: updateReflection.trim() || null,
        mood: updateMood || null,
        next_step: updateNextStep.trim() || null,
        image_url: updateImageUrl.trim() || null,
      })
      .eq("id", updateId);

    if (error) {
      setSavingUpdate(false);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setEditingUpdateId(null);
    setSavingUpdate(false);
    await refreshJourney();
    setNotice({ type: "success", message: "Update saved." });
  };

  const deleteUpdate = async (update: JourneyUpdateWithRespect) => {
    const confirmed = window.confirm(
      "Delete this journey update? This removes the update from the Journey page.",
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("journey_updates")
      .delete()
      .eq("id", update.id);

    if (error) {
      setNotice({ type: "error", message: error.message });
      return;
    }

    await refreshJourney();
    setNotice({ type: "success", message: "Update deleted." });
  };

  const handleUpdatePosted = async () => {
    await refreshJourney();
    setNotice({ type: "success", message: "Update posted." });
  };

  if (loading) {
    return <main className="page-shell">Loading journey...</main>;
  }

  if (!journey) {
    return <main className="page-shell">Journey not found.</main>;
  }

  const latestUpdate = updates[0];
  const totalUpdateRespects = updates.reduce(
    (total, update) => total + update.respect_count,
    0,
  );
  const completedMilestones = milestones.filter(
    (milestone) => milestone.completed_at,
  ).length;
  const linkedCircles = availableCircles.filter((circle) =>
    linkedCircleIds.has(circle.id),
  );

  return (
    <main className="page-shell">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{journey.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <JourneyStatusBadge status={journey.status} />
            <JourneyVisibilityBadge visibility={journey.visibility} />
            {journey.archived_at && (
              <span className="metric-pill">
                <span className="muted">State</span>
                <span className="ml-2 font-semibold">Archived</span>
              </span>
            )}
            {journey.category && (
              <p className="muted text-sm">{journey.category}</p>
            )}
          </div>
        </div>

        {isOwner && !editingJourney && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            <a href="#post-update" className="btn-primary">
              Post Update
            </a>
            <button className="btn-secondary" onClick={startEditingJourney}>
              Edit
            </button>
          </div>
        )}
      </div>

      {journey.archived_at && (
        <div className="panel mt-4">
          <p className="font-semibold">Archived journey</p>
          <p className="muted mt-1 text-sm">
            This journey is hidden from normal lists and public discovery.
          </p>
        </div>
      )}

      {notice && (
        <p className={`notice notice-${notice.type} mt-4`}>
          {notice.message}
        </p>
      )}

      {journey.goal_text && <p className="mt-4">{journey.goal_text}</p>}

      <section className="panel mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-heading">Circles</h2>
            <p className="muted mt-1 text-sm">
              Place this journey inside communities built around similar change.
            </p>
          </div>
          <Link href="/circles" className="text-sm font-semibold">
            Explore Circles
          </Link>
        </div>

        {linkedCircles.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {linkedCircles.map((circle) => (
              <Link
                key={circle.id}
                href={`/circles/${circle.slug}`}
                className="metric-pill"
              >
                <span className="font-semibold">{circle.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="muted mt-4 text-sm">
            This journey is not linked to any Circles yet.
          </p>
        )}

        {isOwner && (
          <div className="mt-4 border-t border-[var(--border)] pt-4">
            {journey.visibility !== "public" && (
              <p className="muted mb-3 text-sm">
                Make this journey public before linking it to Circles.
              </p>
            )}

            {availableCircles.length === 0 ? (
              <p className="muted text-sm">No Circles are available yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {availableCircles.map((circle) => {
                  const isLinked = linkedCircleIds.has(circle.id);

                  return (
                    <div
                      key={circle.id}
                      className="rounded-md border border-[var(--border)] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{circle.name}</p>
                          {circle.category && (
                            <p className="muted mt-1 text-xs">
                              {circle.category}
                            </p>
                          )}
                        </div>
                        <button
                          className={isLinked ? "btn-secondary" : "btn-primary"}
                          disabled={
                            savingCircleId === circle.id ||
                            journey.visibility !== "public"
                          }
                          onClick={() => toggleCircleLink(circle)}
                        >
                          {isLinked ? "Remove" : "Attach"}
                        </button>
                      </div>
                      {circle.description && (
                        <p className="muted mt-2 text-xs">
                          {circle.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {isOwner && editingJourney && (
        <div className="panel mt-4">
          <input
            className="field"
            placeholder="Title"
            value={journeyTitle}
            onChange={(event) => setJourneyTitle(event.target.value)}
          />
          <input
            className="field mt-3"
            placeholder="Category"
            value={journeyCategory}
            onChange={(event) => setJourneyCategory(event.target.value)}
          />
          <textarea
            className="field mt-3 h-28 resize-none"
            placeholder="Goal"
            value={journeyGoalText}
            onChange={(event) => setJourneyGoalText(event.target.value)}
          />
          <label className="mt-3 block">
            <span className="mb-2 block text-sm font-semibold">Status</span>
            <select
              className="field"
              value={journeyStatus}
              onChange={(event) =>
                setJourneyStatus(event.target.value as JourneyStatus)
              }
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="mt-3 block">
            <span className="mb-2 block text-sm font-semibold">Visibility</span>
            <select
              className="field"
              value={journeyVisibility}
              onChange={(event) =>
                setJourneyVisibility(event.target.value as JourneyVisibility)
              }
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="btn-primary"
              disabled={savingJourney}
              onClick={saveJourney}
            >
              {savingJourney ? "Saving..." : "Save Journey"}
            </button>
            <button
              className="btn-secondary"
              disabled={savingJourney}
              onClick={toggleArchiveJourney}
            >
              {journey.archived_at ? "Restore Journey" : "Archive Journey"}
            </button>
            <button
              className="btn-secondary"
              disabled={savingJourney}
              onClick={cancelEditingJourney}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="panel">
          <p className="muted text-xs font-semibold uppercase">Updates</p>
          <p className="mt-1 text-2xl font-bold">{updates.length}</p>
        </div>
        <div className="panel">
          <p className="muted text-xs font-semibold uppercase">Latest</p>
          <p className="mt-1 text-sm font-semibold">
            {latestUpdate
              ? latestUpdate.created_at
                ? new Date(latestUpdate.created_at).toLocaleDateString()
                : "Just now"
              : "No updates"}
          </p>
        </div>
        <div className="panel">
          <p className="muted text-xs font-semibold uppercase">Respect</p>
          <p className="mt-1 text-2xl font-bold">{totalUpdateRespects}</p>
        </div>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-heading">Milestones</h2>
          <span className="muted text-sm">
            {completedMilestones}/{milestones.length} complete
          </span>
        </div>

        {isOwner && (
          <div className="panel mb-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <input
                className="field"
                placeholder="Milestone title"
                value={milestoneTitle}
                onChange={(event) => setMilestoneTitle(event.target.value)}
              />
              <input
                className="field"
                type="date"
                value={milestoneTargetDate}
                onChange={(event) =>
                  setMilestoneTargetDate(event.target.value)
                }
              />
            </div>
            <button
              className="btn-primary mt-3"
              disabled={savingMilestone}
              onClick={addMilestone}
            >
              {savingMilestone ? "Adding..." : "Add Milestone"}
            </button>
          </div>
        )}

        {milestones.length === 0 ? (
          <div className="panel">
            <p className="font-semibold">No milestones yet.</p>
            <p className="muted mt-2 text-sm">
              Milestones turn a transformation into visible checkpoints.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {milestones.map((milestone) => (
              <article key={milestone.id} className="panel">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`font-semibold ${
                        milestone.completed_at ? "line-through opacity-70" : ""
                      }`}
                    >
                      {milestone.title}
                    </p>
                    <div className="muted mt-2 flex flex-wrap gap-3 text-sm">
                      {milestone.target_date && (
                        <span>
                          Target{" "}
                          {new Date(
                            `${milestone.target_date}T00:00:00`,
                          ).toLocaleDateString()}
                        </span>
                      )}
                      {milestone.completed_at && (
                        <span>
                          Completed{" "}
                          {new Date(
                            milestone.completed_at,
                          ).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      className={
                        milestone.completed_at ? "btn-secondary" : "btn-primary"
                      }
                      onClick={() => toggleMilestone(milestone)}
                    >
                      {milestone.completed_at ? "Reopen" : "Complete"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isOwner && (
        <section id="post-update" className="scroll-mt-24">
          <UploadUpdateForm
            journeyId={journeyId}
            currentUserId={currentUserId}
            onPosted={handleUpdatePosted}
          />
        </section>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-heading">Updates</h2>
          <span className="muted text-sm">Newest first</span>
        </div>

        {updates.length === 0 && (
          <div className="panel">
            <p className="font-semibold">No updates yet.</p>
            <p className="muted mt-2 text-sm">
              Post the first proof of progress when there is something real to
              mark.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {updates.map((update) => (
            <article key={update.id} className="panel">
              {editingUpdateId === update.id ? (
                <div>
                  <textarea
                    className="field h-28 resize-none"
                    value={updateText}
                    onChange={(event) => setUpdateText(event.target.value)}
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input
                      className="field"
                      placeholder="Metric label"
                      value={updateMetricLabel}
                      onChange={(event) =>
                        setUpdateMetricLabel(event.target.value)
                      }
                    />
                    <input
                      className="field"
                      placeholder="Metric value"
                      value={updateMetricValue}
                      onChange={(event) =>
                        setUpdateMetricValue(event.target.value)
                      }
                    />
                  </div>
                  <input
                    className="field mt-3"
                    placeholder="Evidence image URL"
                    value={updateImageUrl}
                    onChange={(event) => setUpdateImageUrl(event.target.value)}
                  />
                  <textarea
                    className="field mt-3 h-24 resize-none"
                    placeholder="Reflection"
                    value={updateReflection}
                    onChange={(event) =>
                      setUpdateReflection(event.target.value)
                    }
                  />
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <select
                      className="field"
                      value={updateMood}
                      onChange={(event) => setUpdateMood(event.target.value)}
                    >
                      <option value="">Mood</option>
                      <option value="energized">Energized</option>
                      <option value="steady">Steady</option>
                      <option value="challenged">Challenged</option>
                      <option value="stuck">Stuck</option>
                      <option value="proud">Proud</option>
                    </select>
                    <input
                      className="field"
                      placeholder="Next step"
                      value={updateNextStep}
                      onChange={(event) =>
                        setUpdateNextStep(event.target.value)
                      }
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="btn-primary"
                      disabled={savingUpdate}
                      onClick={() => saveUpdate(update.id)}
                    >
                      {savingUpdate ? "Saving..." : "Save Update"}
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={savingUpdate}
                      onClick={cancelEditingUpdate}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <time className="muted text-xs font-semibold uppercase">
                        {update.created_at
                          ? new Date(update.created_at).toLocaleDateString()
                          : "Just now"}
                      </time>
                      <JourneyStatusBadge status={journey.status} />
                      {isOwner && (
                        <JourneyVisibilityBadge visibility={journey.visibility} />
                      )}
                      {update.updated_at &&
                        update.created_at &&
                        update.updated_at !== update.created_at && (
                          <span className="metric-pill text-xs">
                            Edited
                          </span>
                        )}
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

                  <p className="text-sm">{update.text}</p>

                  <div className="muted mt-3 flex flex-wrap gap-3 text-xs">
                    <span>
                      {update.respect_count}{" "}
                      {update.respect_count === 1 ? "supporter" : "supporters"}
                    </span>
                    <span>
                      {update.comment_count}{" "}
                      {update.comment_count === 1 ? "comment" : "comments"}
                    </span>
                    {update.recent_supporters.length > 0 && (
                      <span>
                        Supported by {update.recent_supporters.join(", ")}
                      </span>
                    )}
                    {update.recent_commenters.length > 0 && (
                      <span>
                        Commented by {update.recent_commenters.join(", ")}
                      </span>
                    )}
                  </div>

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

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <RespectButton
                      targetId={update.id}
                      targetType="journey_update"
                      currentUserId={currentUserId}
                      initialCount={update.respect_count}
                      initiallyRespected={update.respected_by_me}
                    />
                    <a
                      className="btn-secondary"
                      href={`#comments-${update.id}`}
                      aria-label="Comment on this journey update"
                    >
                      {commentActionLabel(update.comment_count)}
                    </a>

                    {isOwner && (
                      <>
                        <button
                          className="btn-secondary"
                          onClick={() => startEditingUpdate(update)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => deleteUpdate(update)}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>

                  <JourneyUpdateComments
                    journeyId={journey.id}
                    updateId={update.id}
                    currentUserId={currentUserId}
                    isJourneyOwner={isOwner}
                    anchorId={`comments-${update.id}`}
                  />
                </>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
