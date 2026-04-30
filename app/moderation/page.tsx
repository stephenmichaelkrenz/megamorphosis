"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Journey, JourneyUpdateComment, Post, PostComment } from "@/types";

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

type ModerationComment = {
  id: string;
  user_id: string;
  body: string;
  hidden_at: string | null;
  hidden_by: string | null;
  created_at: string;
  source: "journey" | "post";
  journey_id?: string;
  post_id?: string;
  journey?: Pick<Journey, "id" | "title">;
  post?: Pick<Post, "id" | "content">;
  profile?: ProfileSummary;
  hiddenByProfile?: ProfileSummary;
  reports: CommentReport[];
};

type TractionMetrics = {
  generated_at: string;
  acquisition: {
    total_profiles: number;
    onboarded_profiles: number;
    new_profiles_7d: number;
    new_profiles_30d: number;
  };
  creation: {
    total_journeys: number;
    public_journeys: number;
    archived_journeys: number;
    new_journeys_7d: number;
    new_journeys_30d: number;
    total_updates: number;
    updates_7d: number;
    updates_30d: number;
    total_posts: number;
    total_milestones: number;
    completed_milestones: number;
  };
  engagement: {
    total_comments: number;
    comments_7d: number;
    total_respects: number;
    total_follows: number;
    total_messages: number;
    messages_7d: number;
  };
  community: {
    total_circles: number;
    total_circle_members: number;
    total_checkins: number;
    checkins_7d: number;
    checkins_30d: number;
  };
  retention: {
    active_users_7d: number;
    active_users_30d: number;
    users_with_journeys: number;
    users_with_updates: number;
  };
  moderation: {
    total_reports: number;
    hidden_comments: number;
    total_blocks: number;
  };
};

type ModerationTab = "traction" | "reports" | "hidden" | "blocks";

const profileName = (profile?: ProfileSummary) => {
  if (!profile) return "Someone";
  return profile.display_name || (profile.username ? `@${profile.username}` : "Someone");
};

const numberFormatter = new Intl.NumberFormat();

const formatNumber = (value: number) => numberFormatter.format(value);

const formatRate = (value: number, total: number) => {
  if (total === 0) return "0%";

  return `${Math.round((value / total) * 100)}%`;
};

export default function ModerationPage() {
  const router = useRouter();
  const [comments, setComments] = useState<ModerationComment[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ModerationTab>("traction");
  const [traction, setTraction] = useState<TractionMetrics | null>(null);
  const [tractionError, setTractionError] = useState<string | null>(null);

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

    const [
      { data: tractionData, error: tractionLoadError },
      { data: reportData },
      { data: postReportData },
      { data: hiddenCommentData },
      { data: hiddenPostCommentData },
      { data: blockData },
    ] =
      await Promise.all([
        supabase.rpc("get_platform_traction"),
        supabase
          .from("comment_reports")
          .select("id, comment_id, reporter_id, reason, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("post_comment_reports")
          .select("id, comment_id, reporter_id, reason, created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("journey_update_comments")
          .select("*")
          .not("hidden_at", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("post_comments")
          .select("*")
          .not("hidden_at", "is", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id, created_at")
          .eq("blocker_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

    if (tractionLoadError) {
      setTraction(null);
      setTractionError(tractionLoadError.message);
    } else {
      setTraction(tractionData as TractionMetrics);
      setTractionError(null);
    }

    const reportRows = (reportData ?? []) as CommentReport[];
    const postReportRows = (postReportData ?? []) as CommentReport[];
    const reportCommentIds = Array.from(
      new Set(reportRows.map((report) => report.comment_id)),
    );
    const reportedPostCommentIds = Array.from(
      new Set(postReportRows.map((report) => report.comment_id)),
    );

    const { data: reportedCommentData } = reportCommentIds.length
      ? await supabase
          .from("journey_update_comments")
          .select("*")
          .in("id", reportCommentIds)
          .order("created_at", { ascending: false })
      : { data: [] };
    const { data: reportedPostCommentData } = reportedPostCommentIds.length
      ? await supabase
          .from("post_comments")
          .select("*")
          .in("id", reportedPostCommentIds)
          .order("created_at", { ascending: false })
      : { data: [] };

    const commentsById = new Map<string, JourneyUpdateComment>();
    (
      [
        ...(reportedCommentData ?? []),
        ...(hiddenCommentData ?? []),
      ] as JourneyUpdateComment[]
    ).forEach((comment) => commentsById.set(comment.id, comment));
    const postCommentsById = new Map<string, PostComment>();
    (
      [
        ...(reportedPostCommentData ?? []),
        ...(hiddenPostCommentData ?? []),
      ] as PostComment[]
    ).forEach((comment) => postCommentsById.set(comment.id, comment));

    const commentRows = Array.from(commentsById.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    const postCommentRows = Array.from(postCommentsById.values()).sort(
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
    const postIds = Array.from(
      new Set(postCommentRows.map((comment) => comment.post_id)),
    );
    const { data: postData } = postIds.length
      ? await supabase.from("posts").select("id, content").in("id", postIds)
      : { data: [] };

    const journeys = (journeyData ?? []) as Pick<Journey, "id" | "title">[];
    const journeyMap = new Map(journeys.map((journey) => [journey.id, journey]));
    const posts = (postData ?? []) as Pick<Post, "id" | "content">[];
    const postMap = new Map(posts.map((post) => [post.id, post]));

    const reportsByComment = new Map<string, CommentReport[]>();
    reportRows.forEach((report) => {
      reportsByComment.set(report.comment_id, [
        ...(reportsByComment.get(report.comment_id) ?? []),
        report,
      ]);
    });
    const reportsByPostComment = new Map<string, CommentReport[]>();
    postReportRows.forEach((report) => {
      reportsByPostComment.set(report.comment_id, [
        ...(reportsByPostComment.get(report.comment_id) ?? []),
        report,
      ]);
    });

    const profileIds = new Set<string>();
    commentRows.forEach((comment) => {
      profileIds.add(comment.user_id);
      if (comment.hidden_by) profileIds.add(comment.hidden_by);
    });
    postCommentRows.forEach((comment) => {
      profileIds.add(comment.user_id);
      if (comment.hidden_by) profileIds.add(comment.hidden_by);
    });
    reportRows.forEach((report) => profileIds.add(report.reporter_id));
    postReportRows.forEach((report) => profileIds.add(report.reporter_id));
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
    const journeyModerationComments: ModerationComment[] = commentRows.map(
      (comment) => ({
        id: comment.id,
        user_id: comment.user_id,
        body: comment.body,
        hidden_at: comment.hidden_at,
        hidden_by: comment.hidden_by,
        created_at: comment.created_at,
        source: "journey",
        journey_id: comment.journey_id,
        journey: journeyMap.get(comment.journey_id),
        profile: profileMap[comment.user_id],
        hiddenByProfile: comment.hidden_by ? profileMap[comment.hidden_by] : undefined,
        reports: reportsByComment.get(comment.id) ?? [],
      }),
    );
    const postModerationComments: ModerationComment[] = postCommentRows.map(
      (comment) => ({
        id: comment.id,
        user_id: comment.user_id,
        body: comment.body,
        hidden_at: comment.hidden_at,
        hidden_by: comment.hidden_by,
        created_at: comment.created_at,
        source: "post",
        post_id: comment.post_id,
        post: postMap.get(comment.post_id),
        profile: profileMap[comment.user_id],
        hiddenByProfile: comment.hidden_by ? profileMap[comment.hidden_by] : undefined,
        reports: reportsByPostComment.get(comment.id) ?? [],
      }),
    );

    setComments(
      [...journeyModerationComments, ...postModerationComments].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
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

    const table =
      comment.source === "post" ? "post_comments" : "journey_update_comments";
    const { error } = await supabase
      .from(table)
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

  const metricCard = (
    label: string,
    value: number | string,
    detail?: string,
  ) => (
    <div className="panel">
      <p className="muted text-xs font-semibold uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {detail && <p className="muted mt-2 text-sm">{detail}</p>}
    </div>
  );

  const renderComment = (comment: ModerationComment) => (
    <article key={comment.id} className="panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{profileName(comment.profile)}</p>
          <p className="muted mt-1 text-sm">
            On{" "}
            <Link
              href={
                comment.source === "post"
                  ? `/#post-comments-${comment.post_id}`
                  : `/journey/${comment.journey_id}`
              }
              className="font-semibold"
            >
              {comment.source === "post"
                ? "Feed post"
                : (comment.journey?.title ?? "Journey")}
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
      {comment.source === "post" && comment.post?.content && (
        <p className="muted mt-3 border-l border-[var(--border)] pl-3 text-sm">
          {comment.post.content}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="metric-pill">
          {comment.source === "post" ? "Feed" : "Journey"}
        </span>
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
          className={`panel text-left ${activeTab === "traction" ? "border-foreground" : ""}`}
          onClick={() => setActiveTab("traction")}
        >
          <p className="muted text-xs font-semibold uppercase">Traction</p>
          <p className="mt-1 text-2xl font-bold">
            {traction ? formatNumber(traction.retention.active_users_30d) : "-"}
          </p>
          <p className="muted mt-1 text-xs">30-day active users</p>
        </button>
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

      {activeTab === "traction" && (
        <section className="space-y-8">
          <div>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="section-heading">Traction Dashboard</h2>
                <p className="muted mt-1 text-sm">
                  Private platform metrics for investor conversations and
                  product focus.
                </p>
              </div>
              {traction?.generated_at && (
                <p className="muted text-xs">
                  Updated {new Date(traction.generated_at).toLocaleString()}
                </p>
              )}
            </div>

            {tractionError && (
              <p className="notice notice-error">
                Could not load traction metrics: {tractionError}
              </p>
            )}

            {!traction && !tractionError && (
              <p className="muted panel">No traction metrics available yet.</p>
            )}
          </div>

          {traction && (
            <>
              <div>
                <h3 className="mb-3 font-semibold">Acquisition</h3>
                <div className="grid gap-3 md:grid-cols-4">
                  {metricCard("Profiles", traction.acquisition.total_profiles)}
                  {metricCard(
                    "Onboarded",
                    traction.acquisition.onboarded_profiles,
                    `${formatRate(
                      traction.acquisition.onboarded_profiles,
                      traction.acquisition.total_profiles,
                    )} onboarding rate`,
                  )}
                  {metricCard(
                    "New Users 7D",
                    traction.acquisition.new_profiles_7d,
                  )}
                  {metricCard(
                    "New Users 30D",
                    traction.acquisition.new_profiles_30d,
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Creation</h3>
                <div className="grid gap-3 md:grid-cols-4">
                  {metricCard("Journeys", traction.creation.total_journeys)}
                  {metricCard(
                    "Public Journeys",
                    traction.creation.public_journeys,
                    `${formatRate(
                      traction.creation.public_journeys,
                      traction.creation.total_journeys,
                    )} public`,
                  )}
                  {metricCard("Updates", traction.creation.total_updates)}
                  {metricCard("Updates 7D", traction.creation.updates_7d)}
                  {metricCard("Updates 30D", traction.creation.updates_30d)}
                  {metricCard("Posts", traction.creation.total_posts)}
                  {metricCard("Milestones", traction.creation.total_milestones)}
                  {metricCard(
                    "Completed Milestones",
                    traction.creation.completed_milestones,
                    `${formatRate(
                      traction.creation.completed_milestones,
                      traction.creation.total_milestones,
                    )} complete`,
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Engagement</h3>
                <div className="grid gap-3 md:grid-cols-4">
                  {metricCard("Comments", traction.engagement.total_comments)}
                  {metricCard("Comments 7D", traction.engagement.comments_7d)}
                  {metricCard("Respect", traction.engagement.total_respects)}
                  {metricCard("Follows", traction.engagement.total_follows)}
                  {metricCard("Messages", traction.engagement.total_messages)}
                  {metricCard("Messages 7D", traction.engagement.messages_7d)}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Community</h3>
                <div className="grid gap-3 md:grid-cols-4">
                  {metricCard("Circles", traction.community.total_circles)}
                  {metricCard(
                    "Circle Members",
                    traction.community.total_circle_members,
                  )}
                  {metricCard("Check-ins", traction.community.total_checkins)}
                  {metricCard("Check-ins 7D", traction.community.checkins_7d)}
                  {metricCard("Check-ins 30D", traction.community.checkins_30d)}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Retention Proxy</h3>
                <div className="grid gap-3 md:grid-cols-4">
                  {metricCard(
                    "Active Users 7D",
                    traction.retention.active_users_7d,
                  )}
                  {metricCard(
                    "Active Users 30D",
                    traction.retention.active_users_30d,
                  )}
                  {metricCard(
                    "Users With Journeys",
                    traction.retention.users_with_journeys,
                    `${formatRate(
                      traction.retention.users_with_journeys,
                      traction.acquisition.onboarded_profiles,
                    )} of onboarded`,
                  )}
                  {metricCard(
                    "Users With Updates",
                    traction.retention.users_with_updates,
                    `${formatRate(
                      traction.retention.users_with_updates,
                      traction.acquisition.onboarded_profiles,
                    )} of onboarded`,
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold">Trust And Safety</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {metricCard("Reports", traction.moderation.total_reports)}
                  {metricCard(
                    "Hidden Comments",
                    traction.moderation.hidden_comments,
                  )}
                  {metricCard("Blocks", traction.moderation.total_blocks)}
                </div>
              </div>
            </>
          )}
        </section>
      )}

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
