"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Journey, JourneyUpdateComment } from "@/types";

type ProfileSummary = {
  id: string;
  username: string | null;
  display_name: string | null;
};

type CommentReport = {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
};

type BlockRow = {
  blocker_id: string;
  blocked_id: string;
  created_at: string;
};

type ModerationComment = JourneyUpdateComment & {
  journey?: Pick<Journey, "id" | "title">;
  profile?: ProfileSummary;
  hiddenByProfile?: ProfileSummary;
  reports: CommentReport[];
};

type ModerationTab = "reports" | "hidden" | "blocks";

const profileName = (profile?: ProfileSummary) => {
  if (!profile) return "Someone";
  return profile.display_name || (profile.username ? `@${profile.username}` : "Someone");
};

export default function ModerationPage() {
  const router = useRouter();
  const [comments, setComments] = useState<ModerationComment[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ModerationTab>("reports");

  const loadModeration = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login?next=/moderation");
      return;
    }

    setCurrentUserId(user.id);

    const { data: isModerator, error: moderatorError } = await supabase.rpc(
      "is_platform_moderator",
    );

    if (moderatorError || !isModerator) {
      router.push("/dashboard");
      return;
    }

    const [{ data: reportData }, { data: hiddenCommentData }, { data: blockData }] =
      await Promise.all([
        supabase
          .from("comment_reports")
          .select("id, comment_id, reporter_id, reason, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("journey_update_comments")
          .select("*")
          .not("hidden_at", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id, created_at")
          .eq("blocker_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

    const reportRows = (reportData ?? []) as CommentReport[];
    const reportCommentIds = Array.from(
      new Set(reportRows.map((report) => report.comment_id)),
    );

    const { data: reportedCommentData } = reportCommentIds.length
      ? await supabase
          .from("journey_update_comments")
          .select("*")
          .in("id", reportCommentIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const commentsById = new Map<string, JourneyUpdateComment>();
    (
      [
        ...(reportedCommentData ?? []),
        ...(hiddenCommentData ?? []),
      ] as JourneyUpdateComment[]
    ).forEach((comment) => commentsById.set(comment.id, comment));

    const commentRows = Array.from(commentsById.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const journeyIds = Array.from(
      new Set(commentRows.map((comment) => comment.journey_id)),
    );

    const { data: journeyData } = journeyIds.length
      ? await supabase
          .from("journeys")
          .select("id, title")
          .in("id", journeyIds)
      : { data: [] };

    const journeys = (journeyData ?? []) as Pick<Journey, "id" | "title">[];
    const journeyMap = new Map(journeys.map((journey) => [journey.id, journey]));

    const reportsByComment = new Map<string, CommentReport[]>();
    reportRows.forEach((report) => {
      reportsByComment.set(report.comment_id, [
        ...(reportsByComment.get(report.comment_id) ?? []),
        report,
      ]);
    });

    const profileIds = new Set<string>();
    commentRows.forEach((comment) => {
      profileIds.add(comment.user_id);
      if (comment.hidden_by) profileIds.add(comment.hidden_by);
    });
    reportRows.forEach((report) => profileIds.add(report.reporter_id));
    (blockData ?? []).forEach((block) => {
      profileIds.add(block.blocker_id);
      profileIds.add(block.blocked_id);
    });

    const { data: profileData } = profileIds.size
      ? await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", Array.from(profileIds))
      : { data: [] };

    const profileMap = Object.fromEntries(
      ((profileData ?? []) as ProfileSummary[]).map((profile) => [
        profile.id,
        profile,
      ]),
    );

    setProfiles(profileMap);
    setBlocks((blockData ?? []) as BlockRow[]);
    setComments(
      commentRows.map((comment) => ({
        ...comment,
        journey: journeyMap.get(comment.journey_id),
        profile: profileMap[comment.user_id],
        hiddenByProfile: comment.hidden_by ? profileMap[comment.hidden_by] : undefined,
        reports: reportsByComment.get(comment.id) ?? [],
      })),
    );
    setLoading(false);
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadModeration();
  }, [loadModeration]);

  const reportedComments = useMemo(
    () => comments.filter((comment) => comment.reports.length > 0),
    [comments],
  );
  const hiddenComments = useMemo(
    () => comments.filter((comment) => comment.hidden_at),
    [comments],
  );

  const toggleHidden = async (comment: ModerationComment) => {
    if (!currentUserId) {
      router.push("/auth/login?next=/moderation");
      return;
    }

    setWorkingId(comment.id);

    const { error } = await supabase
      .from("journey_update_comments")
      .update({
        hidden_at: comment.hidden_at ? null : new Date().toISOString(),
        hidden_by: comment.hidden_at ? null : currentUserId,
      })
      .eq("id", comment.id);

    if (error) {
      setWorkingId(null);
      alert(error.message);
      return;
    }

    await loadModeration();
    setWorkingId(null);
  };

  const blockUser = async (blockedId: string) => {
    if (!currentUserId) {
      router.push("/auth/login?next=/moderation");
      return;
    }

    setWorkingId(blockedId);

    const { error } = await supabase.from("user_blocks").upsert({
      blocker_id: currentUserId,
      blocked_id: blockedId,
    });

    if (error) {
      setWorkingId(null);
      alert(error.message);
      return;
    }

    await loadModeration();
    setWorkingId(null);
  };

  const unblockUser = async (blockedId: string) => {
    if (!currentUserId) {
      router.push("/auth/login?next=/moderation");
      return;
    }

    setWorkingId(blockedId);

    const { error } = await supabase
      .from("user_blocks")
      .delete()
      .eq("blocker_id", currentUserId)
      .eq("blocked_id", blockedId);

    if (error) {
      setWorkingId(null);
      alert(error.message);
      return;
    }

    await loadModeration();
    setWorkingId(null);
  };

  const isBlocked = (userId: string) =>
    blocks.some((block) => block.blocked_id === userId);

  const renderComment = (comment: ModerationComment) => (
    <article key={comment.id} className="panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{profileName(comment.profile)}</p>
          <p className="muted mt-1 text-sm">
            On{" "}
            <Link href={`/journey/${comment.journey_id}`} className="font-semibold">
              {comment.journey?.title ?? "Journey"}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn-secondary"
            disabled={workingId === comment.id}
            onClick={() => toggleHidden(comment)}
          >
            {comment.hidden_at ? "Unhide" : "Hide"}
          </button>
          <button
            className="btn-secondary"
            disabled={workingId === comment.user_id || isBlocked(comment.user_id)}
            onClick={() => blockUser(comment.user_id)}
          >
            {isBlocked(comment.user_id) ? "Blocked" : "Block User"}
          </button>
        </div>
      </div>

      <p className="mt-4">{comment.body}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {comment.hidden_at && (
          <span className="metric-pill">
            Hidden by {profileName(comment.hiddenByProfile)}
          </span>
        )}
        <span className="metric-pill">
          <span className="muted">Reports</span>
          <span className="ml-2 font-semibold">{comment.reports.length}</span>
        </span>
        <time className="metric-pill">
          {new Date(comment.created_at).toLocaleString()}
        </time>
      </div>

      {comment.reports.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">
          {comment.reports.map((report) => (
            <div key={report.id} className="text-sm">
              <p className="font-semibold">{report.reason}</p>
              <p className="muted">
                Reported by {profileName(profiles[report.reporter_id])} on{" "}
                {new Date(report.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </article>
  );

  if (loading) {
    return <main className="wide-shell">Loading moderation...</main>;
  }

  return (
    <main className="wide-shell">
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Moderation</h1>
        <p className="muted mt-2 max-w-2xl">
          Review reported comments, keep hidden comments visible to you, and
          manage blocked users across your journeys.
        </p>
      </section>

      <section className="mb-8 grid gap-3 md:grid-cols-3">
        <button
          className={`panel text-left ${activeTab === "reports" ? "border-foreground" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <p className="muted text-xs font-semibold uppercase">Reports</p>
          <p className="mt-1 text-2xl font-bold">{reportedComments.length}</p>
        </button>
        <button
          className={`panel text-left ${activeTab === "hidden" ? "border-foreground" : ""}`}
          onClick={() => setActiveTab("hidden")}
        >
          <p className="muted text-xs font-semibold uppercase">Hidden</p>
          <p className="mt-1 text-2xl font-bold">{hiddenComments.length}</p>
        </button>
        <button
          className={`panel text-left ${activeTab === "blocks" ? "border-foreground" : ""}`}
          onClick={() => setActiveTab("blocks")}
        >
          <p className="muted text-xs font-semibold uppercase">Blocked</p>
          <p className="mt-1 text-2xl font-bold">{blocks.length}</p>
        </button>
      </section>

      {activeTab === "reports" && (
        <section>
          <h2 className="section-heading mb-3">Reported Comments</h2>
          {reportedComments.length === 0 ? (
            <p className="muted panel">No reported comments to review.</p>
          ) : (
            <div className="space-y-3">{reportedComments.map(renderComment)}</div>
          )}
        </section>
      )}

      {activeTab === "hidden" && (
        <section>
          <h2 className="section-heading mb-3">Hidden Comments</h2>
          {hiddenComments.length === 0 ? (
            <p className="muted panel">No hidden comments right now.</p>
          ) : (
            <div className="space-y-3">{hiddenComments.map(renderComment)}</div>
          )}
        </section>
      )}

      {activeTab === "blocks" && (
        <section>
          <h2 className="section-heading mb-3">Blocked Users</h2>
          {blocks.length === 0 ? (
            <p className="muted panel">No blocked users right now.</p>
          ) : (
            <div className="space-y-3">
              {blocks.map((block) => {
                const blockedProfile = profiles[block.blocked_id];

                return (
                  <article key={block.blocked_id} className="panel">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{profileName(blockedProfile)}</p>
                        <p className="muted mt-1 text-sm">
                          Blocked {new Date(block.created_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        className="btn-secondary"
                        disabled={workingId === block.blocked_id}
                        onClick={() => unblockUser(block.blocked_id)}
                      >
                        Unblock
                      </button>
                    </div>
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
