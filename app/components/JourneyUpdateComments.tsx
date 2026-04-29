"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { JourneyUpdateComment } from "@/types";

type CommentWithProfile = JourneyUpdateComment & {
  profile?: {
    username: string | null;
    display_name: string | null;
  };
};

const reportReasons = [
  "Spam",
  "Harassment",
  "Hate or abuse",
  "Privacy concern",
  "Other",
];

export default function JourneyUpdateComments({
  journeyId,
  updateId,
  currentUserId,
  isJourneyOwner,
}: {
  journeyId: string;
  updateId: string;
  currentUserId: string | null;
  isJourneyOwner: boolean;
}) {
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadComments = useCallback(async () => {
    const { data: commentData } = await supabase
      .from("journey_update_comments")
      .select("*")
      .eq("journey_update_id", updateId)
      .order("created_at", { ascending: true });

    const profileIds = Array.from(
      new Set((commentData ?? []).map((comment) => comment.user_id)),
    );

    const { data: profileData } = profileIds.length
      ? await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", profileIds)
      : { data: [] };

    setComments(
      (commentData ?? []).map((comment) => ({
        ...comment,
        profile: profileData?.find((profile) => profile.id === comment.user_id),
      })),
    );
    setLoading(false);
  }, [updateId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadComments();
  }, [loadComments]);

  const addComment = async () => {
    const trimmedBody = body.trim();

    if (!trimmedBody) {
      alert("Comment text is required.");
      return;
    }

    setPosting(true);

    if (!currentUserId) {
      setPosting(false);
      alert("Log in to comment.");
      return;
    }

    const { error } = await supabase.from("journey_update_comments").insert({
      journey_id: journeyId,
      journey_update_id: updateId,
      user_id: currentUserId,
      body: trimmedBody,
    });

    if (error) {
      setPosting(false);
      alert(error.message);
      return;
    }

    setBody("");
    setPosting(false);
    await loadComments();
  };

  const deleteOwnComment = async (comment: JourneyUpdateComment) => {
    const { error } = await supabase
      .from("journey_update_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", comment.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadComments();
  };

  const toggleHidden = async (comment: JourneyUpdateComment) => {
    const { error } = await supabase
      .from("journey_update_comments")
      .update({
        hidden_at: comment.hidden_at ? null : new Date().toISOString(),
        hidden_by: comment.hidden_at ? null : currentUserId,
      })
      .eq("id", comment.id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadComments();
  };

  const reportComment = async (comment: JourneyUpdateComment) => {
    const reason = window.prompt(
      `Why are you reporting this comment?\n\n${reportReasons.join(", ")}`,
      "Other",
    );

    const trimmedReason = reason?.trim();
    if (!trimmedReason) return;

    if (!currentUserId) {
      alert("Log in to report comments.");
      return;
    }

    const { error } = await supabase.from("comment_reports").insert({
      comment_id: comment.id,
      reporter_id: currentUserId,
      reason: trimmedReason,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Report submitted.");
  };

  const blockUser = async (blockedUserId: string) => {
    if (!currentUserId) {
      alert("Log in to block users.");
      return;
    }

    if (currentUserId === blockedUserId) {
      alert("You cannot block yourself.");
      return;
    }

    const { error } = await supabase.from("user_blocks").upsert({
      blocker_id: currentUserId,
      blocked_id: blockedUserId,
    });

    if (error) {
      alert(error.message);
      return;
    }

    await loadComments();
  };

  return (
    <section className="mt-4 border-t border-[var(--border)] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold">Comments</h3>
        <span className="muted text-xs">{comments.length}</span>
      </div>

      {loading ? (
        <p className="muted text-sm">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="muted text-sm">No comments yet.</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isOwnComment = currentUserId === comment.user_id;
            const username = comment.profile?.username;

            return (
              <article key={comment.id} className="border-l border-[var(--border)] pl-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {username ? (
                    <Link href={`/user/${username}`} className="font-semibold">
                      @{username}
                    </Link>
                  ) : (
                    <span className="font-semibold">
                      {comment.profile?.display_name || "Someone"}
                    </span>
                  )}
                  {comment.hidden_at && (
                    <span className="muted text-xs">Hidden</span>
                  )}
                  <time className="muted text-xs">
                    {new Date(comment.created_at).toLocaleString()}
                  </time>
                </div>

                <p className="mt-1 text-sm">{comment.body}</p>

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {isOwnComment && (
                    <button
                      className="font-semibold"
                      onClick={() => deleteOwnComment(comment)}
                    >
                      Delete
                    </button>
                  )}
                  {isJourneyOwner && !isOwnComment && (
                    <button
                      className="font-semibold"
                      onClick={() => toggleHidden(comment)}
                    >
                      {comment.hidden_at ? "Unhide" : "Hide"}
                    </button>
                  )}
                  {currentUserId && !isOwnComment && (
                    <>
                      <button
                        className="font-semibold"
                        onClick={() => reportComment(comment)}
                      >
                        Report
                      </button>
                      <button
                        className="font-semibold"
                        onClick={() => blockUser(comment.user_id)}
                      >
                        Block
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        {currentUserId ? (
          <>
            <textarea
              className="field h-20 resize-none"
              placeholder="Add support, encouragement, or a question..."
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <button
              className="btn-secondary mt-2"
              disabled={posting}
              onClick={addComment}
            >
              {posting ? "Commenting..." : "Comment"}
            </button>
          </>
        ) : (
          <div className="panel">
            <p className="text-sm font-semibold">Join the conversation.</p>
            <p className="muted mt-1 text-sm">
              Log in to add encouragement, questions, or proof of support.
            </p>
            <Link href="/auth/login" className="btn-secondary mt-3 inline-block">
              Log In to Comment
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
