"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EditablePostCard from "@/components/EditablePostCard";
import { supabase } from "@/lib/supabaseClient";
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
};

export default function HomePage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

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

    const [{ data: profiles }, { data: respects }] = await Promise.all([
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
    ]);

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

    return {
      posts:
        postsData?.map((post) => ({
          ...post,
          profile: profiles?.find((profile) => profile.id === post.user_id),
          respect_count: respectCounts.get(post.id) ?? 0,
          respected_by_me: respectedByMe.has(post.id),
        })) ?? [],
      userId: user.id,
      username: currentProfile?.username ?? null,
    };
  };

  useEffect(() => {
    const loadInitialFeed = async () => {
      const nextFeed = await fetchFeed();
      setPosts(nextFeed.posts);
      setCurrentUserId(nextFeed.userId);
      setCurrentUsername(nextFeed.username);
      setLoading(false);
    };

    void loadInitialFeed();
  }, []);

  const createPost = async () => {
    if (!newPost.trim()) return;

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
      content: newPost.trim(),
    });

    if (error) {
      alert(error.message);
      setPosting(false);
      return;
    }

    setNewPost("");
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

  return (
    <main className="page-shell">
      <section className="mb-10 text-center">
        <h1 className="text-5xl font-bold tracking-normal">MEGAMORPHOSIS</h1>
        <p className="muted mt-4 text-lg">Track your transformation.</p>

        {!loading && (
          <div className="mt-6 flex justify-center gap-3">
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
          <p className="muted text-sm">Preparing your posting tools...</p>
        </section>
      ) : currentUserId ? (
        <section className="panel mb-8">
          <h2 className="mb-3 text-lg font-semibold">Create a Post</h2>
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
        </section>
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

      <section>
        <h2 className="mb-4 text-2xl font-bold">Your Feed</h2>

        {loading && <p>Loading feed...</p>}

        {!loading && posts.length === 0 && (
          <div className="panel">
            <p className="font-semibold">No posts yet.</p>
            <p className="muted mt-2 text-sm">
              {currentUserId
                ? "Follow people, join Circles, or create your first post."
                : "Create an account to make this feed your transformation home."}
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
    </main>
  );
}
