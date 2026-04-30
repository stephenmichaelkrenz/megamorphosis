"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import JourneyStatusBadge from "@/components/JourneyStatusBadge";
import MilestoneProgressBadge from "@/components/MilestoneProgressBadge";
import ProBadge from "@/components/ProBadge";
import { followUser, unfollowUser } from "@/lib/follow";
import { supabase } from "@/lib/supabaseClient";
import { Journey, Post, Profile } from "@/types";

type SearchJourney = Journey & {
  profile?: Pick<Profile, "id" | "username" | "display_name">;
};

type SearchPost = Post & {
  profile?: Pick<Profile, "id" | "username" | "display_name">;
};

type SearchFilter = "all" | "people" | "journeys" | "posts";
const searchFilters: SearchFilter[] = ["all", "people", "journeys", "posts"];

const normalizeQuery = (value: string | null) => (value ?? "").trim();

const escapeSearchTerm = (value: string) =>
  value.replaceAll("%", "\\%").replaceAll("_", "\\_");

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = normalizeQuery(searchParams.get("q"));
  const requestedFilter = searchParams.get("type") as SearchFilter | null;
  const activeFilter =
    requestedFilter && searchFilters.includes(requestedFilter)
      ? requestedFilter
      : "all";

  const [input, setInput] = useState(query);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [journeys, setJourneys] = useState<SearchJourney[]>([]);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [milestoneCounts, setMilestoneCounts] = useState<
    Record<string, { completed: number; total: number }>
  >({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [workingFollowId, setWorkingFollowId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasQuery = query.length > 0;
  const showPeople = activeFilter === "all" || activeFilter === "people";
  const showJourneys = activeFilter === "all" || activeFilter === "journeys";
  const showPosts = activeFilter === "all" || activeFilter === "posts";
  const resultCount =
    (showPeople ? profiles.length : 0) +
    (showJourneys ? journeys.length : 0) +
    (showPosts ? posts.length : 0);

  const escapedQuery = useMemo(() => escapeSearchTerm(query), [query]);

  useEffect(() => {
    const runSearch = async () => {
      if (!hasQuery) {
        setProfiles([]);
        setJourneys([]);
        setPosts([]);
        setMilestoneCounts({});
        setLoading(false);
        return;
      }

      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      const searchPattern = `%${escapedQuery}%`;
      const [
        { data: profileData },
        { data: journeyData },
        { data: postData },
        { data: follows },
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, bio, onboarded, subscription_tier, created_at, updated_at")
          .eq("onboarded", true)
          .or(
            `username.ilike.${searchPattern},display_name.ilike.${searchPattern},bio.ilike.${searchPattern}`,
          )
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("journeys")
          .select("id, user_id, title, category, goal_text, status, visibility, archived_at, created_at, updated_at")
          .eq("visibility", "public")
          .is("archived_at", null)
          .or(
            `title.ilike.${searchPattern},category.ilike.${searchPattern},goal_text.ilike.${searchPattern}`,
          )
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("posts")
          .select("id, user_id, content, created_at, updated_at")
          .ilike("content", searchPattern)
          .order("created_at", { ascending: false })
          .limit(12),
        user
          ? supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      const journeyRows = journeyData ?? [];
      const journeyUserIds = Array.from(
        new Set(journeyRows.map((journey) => journey.user_id)),
      );
      const journeyIds = journeyRows.map((journey) => journey.id);
      const postRows = postData ?? [];
      const postUserIds = Array.from(
        new Set(
          postRows
            .map((post) => post.user_id)
            .filter((userId): userId is string => Boolean(userId)),
        ),
      );

      const [{ data: journeyProfiles }, { data: postProfiles }, { data: milestoneRows }] =
        await Promise.all([
          journeyUserIds.length
            ? supabase
                .from("profiles")
                .select("id, username, display_name")
                .in("id", journeyUserIds)
            : Promise.resolve({ data: [] }),
          postUserIds.length
            ? supabase
                .from("profiles")
                .select("id, username, display_name")
                .in("id", postUserIds)
            : Promise.resolve({ data: [] }),
          journeyIds.length
            ? supabase
                .from("journey_milestones")
                .select("journey_id, completed_at")
                .in("journey_id", journeyIds)
            : Promise.resolve({ data: [] }),
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

      setProfiles(profileData ?? []);
      setJourneys(
        journeyRows.map((journey) => ({
          ...journey,
          profile: journeyProfiles?.find(
            (profile) => profile.id === journey.user_id,
          ),
        })),
      );
      setPosts(
        postRows.map((post) => ({
          ...post,
          profile: postProfiles?.find((profile) => profile.id === post.user_id),
        })),
      );
      setMilestoneCounts(nextMilestoneCounts);
      setFollowingIds(new Set(follows?.map((follow) => follow.following_id) ?? []));
      setLoading(false);
    };

    void runSearch();
  }, [escapedQuery, hasQuery]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextQuery = input.trim();
    const filterParam = activeFilter === "all" ? "" : `&type=${activeFilter}`;
    router.push(
      nextQuery ? `/search?q=${encodeURIComponent(nextQuery)}${filterParam}` : "/search",
    );
  };

  const setFilter = (filter: SearchFilter) => {
    const queryParam = query ? `?q=${encodeURIComponent(query)}` : "";
    const filterParam = filter === "all" ? "" : `${query ? "&" : "?"}type=${filter}`;
    router.push(`/search${queryParam}${filterParam}`);
  };

  const toggleFollow = async (targetUserId: string) => {
    if (!currentUserId) {
      alert("Log in to follow people.");
      return;
    }

    setWorkingFollowId(targetUserId);
    const isFollowing = followingIds.has(targetUserId);
    const { error } = isFollowing
      ? await unfollowUser(targetUserId)
      : await followUser(targetUserId);

    if (error) {
      setWorkingFollowId(null);
      alert(error.message);
      return;
    }

    setFollowingIds((current) => {
      const next = new Set(current);

      if (isFollowing) {
        next.delete(targetUserId);
      } else {
        next.add(targetUserId);
      }

      return next;
    });
    setWorkingFollowId(null);
  };

  const renderFollowButton = (targetUserId: string) => {
    if (!currentUserId || currentUserId === targetUserId) return null;

    const isFollowing = followingIds.has(targetUserId);

    return (
      <button
        className={isFollowing ? "btn-secondary shrink-0" : "btn-primary shrink-0"}
        disabled={workingFollowId === targetUserId}
        onClick={() => toggleFollow(targetUserId)}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    );
  };

  const renderMessageLink = (profile: Pick<Profile, "id" | "username">) => {
    if (!currentUserId || currentUserId === profile.id || !profile.username) {
      return null;
    }

    return (
      <Link
        href={`/messages?to=${encodeURIComponent(profile.username)}`}
        className="btn-secondary shrink-0"
      >
        Message
      </Link>
    );
  };

  return (
    <>
      <section className="mb-8">
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="muted mt-2">Find people and journeys across Megamorphosis.</p>
      </section>

      <form onSubmit={submitSearch} className="panel mb-8">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="field"
            placeholder="Search people, goals, categories..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button className="btn-primary shrink-0" type="submit">
            Search
          </button>
        </div>
      </form>

      <div className="mb-8 flex flex-wrap gap-2">
        {searchFilters.map((filter) => (
          <button
            key={filter}
            className={activeFilter === filter ? "btn-primary" : "btn-secondary"}
            onClick={() => setFilter(filter)}
          >
            {filter[0].toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {!hasQuery && (
        <p className="muted panel">
          Try a username, display name, journey title, category, or goal.
        </p>
      )}

      {hasQuery && loading && <p className="muted panel">Searching...</p>}

      {hasQuery && !loading && resultCount === 0 && (
        <p className="muted panel">No results for “{query}”.</p>
      )}

      {hasQuery && !loading && resultCount > 0 && (
        <div className="space-y-10">
          {showPeople && <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-heading">People</h2>
              <span className="muted text-sm">{profiles.length}</span>
            </div>

            {profiles.length === 0 ? (
              <p className="muted panel">No people matched.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {profiles.map((profile) => (
                  <article key={profile.id} className="panel">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/user/${profile.username}`}
                        className="flex flex-wrap items-center gap-2 font-semibold"
                      >
                        <span>{profile.display_name || "No Name"}</span>
                        <ProBadge tier={profile.subscription_tier} />
                      </Link>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        {renderMessageLink(profile)}
                        {renderFollowButton(profile.id)}
                      </div>
                    </div>
                    <p className="muted mt-1 text-sm">@{profile.username}</p>
                    {profile.bio && <p className="mt-3 text-sm">{profile.bio}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>}

          {showJourneys && <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-heading">Journeys</h2>
              <span className="muted text-sm">{journeys.length}</span>
            </div>

            {journeys.length === 0 ? (
              <p className="muted panel">No journeys matched.</p>
            ) : (
              <div className="space-y-3">
                {journeys.map((journey) => (
                  <article key={journey.id} className="panel">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/journey/${journey.id}`}
                        className="font-semibold"
                      >
                        {journey.title}
                      </Link>
                      {renderFollowButton(journey.user_id)}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <JourneyStatusBadge status={journey.status} />
                      <MilestoneProgressBadge
                        completed={milestoneCounts[journey.id]?.completed ?? 0}
                        total={milestoneCounts[journey.id]?.total ?? 0}
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
          </section>}

          {showPosts && <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="section-heading">Posts</h2>
              <span className="muted text-sm">{posts.length}</span>
            </div>

            {posts.length === 0 ? (
              <p className="muted panel">No posts matched.</p>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <article key={post.id} className="panel">
                    {post.profile?.username && (
                      <Link
                        href={`/user/${post.profile.username}`}
                        className="font-semibold"
                      >
                        @{post.profile.username}
                      </Link>
                    )}
                    <p className="mt-2 text-sm">{post.content}</p>
                    <time className="muted mt-3 block text-xs">
                      {post.created_at
                        ? new Date(post.created_at).toLocaleString()
                        : "Just now"}
                    </time>
                  </article>
                ))}
              </div>
            )}
          </section>}
        </div>
      )}
    </>
  );
}
