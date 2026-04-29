"use client";

import { ReactNode, useState } from "react";
import PostComments from "@/components/PostComments";
import RespectButton from "@/components/RespectButton";
import { supabase } from "@/lib/supabaseClient";
import { Post } from "@/types";

type EditablePost = Pick<
  Post,
  "id" | "user_id" | "content" | "created_at" | "updated_at"
> & {
  respect_count: number;
  respected_by_me: boolean;
  comment_count?: number;
};

export default function EditablePostCard({
  post,
  canEdit,
  currentUserId,
  header,
  onSaved,
}: {
  post: EditablePost;
  canEdit: boolean;
  currentUserId?: string | null;
  header?: ReactNode;
  onSaved: (post: Post) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content ?? "");
  const [commentCount, setCommentCount] = useState(post.comment_count ?? 0);
  const [saving, setSaving] = useState(false);

  const cancelEditing = () => {
    setContent(post.content ?? "");
    setEditing(false);
    setSaving(false);
  };

  const savePost = async () => {
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      alert("Post text is required.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase
      .from("posts")
      .update({ content: trimmedContent })
      .eq("id", post.id)
      .select("id, user_id, content, created_at, updated_at")
      .single();

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    onSaved(data);
    setEditing(false);
    setSaving(false);
  };

  return (
    <article id={`post-${post.id}`} className="panel scroll-mt-24">
      {header}

      {editing ? (
        <div>
          <textarea
            className="field h-24 resize-none"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="btn-primary"
              disabled={saving}
              onClick={savePost}
            >
              {saving ? "Saving..." : "Save Post"}
            </button>
            <button
              className="btn-secondary"
              disabled={saving}
              onClick={cancelEditing}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p>{post.content || ""}</p>
          <time className="muted mt-3 block text-sm">
            {post.created_at
              ? new Date(post.created_at).toLocaleString()
              : "Just now"}
          </time>
          <div className="muted mt-3 flex flex-wrap gap-3 text-xs">
            <span>
              {post.respect_count}{" "}
              {post.respect_count === 1 ? "supporter" : "supporters"}
            </span>
            <span>
              {commentCount} {commentCount === 1 ? "comment" : "comments"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <RespectButton
              targetId={post.id}
              targetType="post"
              currentUserId={currentUserId}
              initialCount={post.respect_count}
              initiallyRespected={post.respected_by_me}
            />

            {canEdit && (
              <button className="btn-secondary" onClick={() => setEditing(true)}>
                Edit
              </button>
            )}
          </div>

          <PostComments
            postId={post.id}
            currentUserId={currentUserId}
            isPostOwner={post.user_id === currentUserId}
            anchorId={`post-comments-${post.id}`}
            onCommentCountChange={setCommentCount}
          />
        </>
      )}
    </article>
  );
}
