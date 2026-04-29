"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { joinCircle, leaveCircle } from "@/lib/circles";
import { supabase } from "@/lib/supabaseClient";
import { Circle } from "@/types";

type CircleWithCounts = Circle & {
  member_count: number;
  journey_count: number;
};

type CircleFilter = "all" | "joined" | "created";
type Notice = {
  type: "error" | "success";
  message: string;
};

export default function CirclesPage() {
  const [circles, setCircles] = useState<CircleWithCounts[]>([]);
  const [joinedCircleIds, setJoinedCircleIds] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [workingCircleId, setWorkingCircleId] = useState<string | null>(null);
  const [filter, setFilter] = useState<CircleFilter>("all");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCircles = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      const [{ data: circleRows }, { data: memberships }] = await Promise.all([
        supabase
          .from("circles")
          .select("*")
          .eq("is_public", true)
          .order("created_at", { ascending: true }),
        user
          ? supabase
              .from("circle_members")
              .select("circle_id")
              .eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);

      const circleIds = circleRows?.map((circle) => circle.id) ?? [];

      const [{ data: memberRows }, { data: journeyRows }] = await Promise.all([
        circleIds.length
          ? supabase
              .from("circle_members")
              .select("circle_id")
              .in("circle_id", circleIds)
          : Promise.resolve({ data: [] }),
        circleIds.length
          ? supabase
              .from("circle_journeys")
              .select("circle_id")
              .in("circle_id", circleIds)
          : Promise.resolve({ data: [] }),
      ]);

      const memberCounts = new Map<string, number>();
      const journeyCounts = new Map<string, number>();

      memberRows?.forEach((member) => {
        memberCounts.set(
          member.circle_id,
          (memberCounts.get(member.circle_id) ?? 0) + 1,
        );
      });

      journeyRows?.forEach((journey) => {
        journeyCounts.set(
          journey.circle_id,
          (journeyCounts.get(journey.circle_id) ?? 0) + 1,
        );
      });

      setCircles(
        circleRows?.map((circle) => ({
          ...circle,
          member_count: memberCounts.get(circle.id) ?? 0,
          journey_count: journeyCounts.get(circle.id) ?? 0,
        })) ?? [],
      );
      setJoinedCircleIds(
        new Set(memberships?.map((membership) => membership.circle_id) ?? []),
      );
      setLoading(false);
    };

    void loadCircles();
  }, []);

  const toggleMembership = async (circle: CircleWithCounts) => {
    if (!currentUserId) {
      setNotice({ type: "error", message: "Log in to join Circles." });
      return;
    }

    const isJoined = joinedCircleIds.has(circle.id);
    setWorkingCircleId(circle.id);
    setNotice(null);

    const { error } = isJoined
      ? await leaveCircle(circle.id, currentUserId)
      : await joinCircle(circle.id, currentUserId);

    if (error) {
      setWorkingCircleId(null);
      setNotice({ type: "error", message: error.message });
      return;
    }

    setJoinedCircleIds((current) => {
      const next = new Set(current);

      if (isJoined) {
        next.delete(circle.id);
      } else {
        next.add(circle.id);
      }

      return next;
    });
    setCircles((currentCircles) =>
      currentCircles.map((currentCircle) =>
        currentCircle.id === circle.id
          ? {
              ...currentCircle,
              member_count: Math.max(
                0,
                currentCircle.member_count + (isJoined ? -1 : 1),
              ),
            }
          : currentCircle,
      ),
    );
    setWorkingCircleId(null);
    setNotice({
      type: "success",
      message: isJoined
        ? `Left ${circle.name}.`
        : `Joined ${circle.name}.`,
    });
  };

  if (loading) {
    return <main className="wide-shell">Loading circles...</main>;
  }

  const joinedCount = circles.filter((circle) =>
    joinedCircleIds.has(circle.id),
  ).length;
  const createdCount = circles.filter(
    (circle) => currentUserId && circle.created_by === currentUserId,
  ).length;
  const filteredCircles = circles.filter((circle) => {
    if (filter === "joined") return joinedCircleIds.has(circle.id);
    if (filter === "created") {
      return Boolean(currentUserId && circle.created_by === currentUserId);
    }

    return true;
  });
  const emptyMessage =
    filter === "joined"
      ? "You have not joined any Circles yet."
      : filter === "created"
        ? "You have not created any Circles yet."
        : "No circles yet.";

  return (
    <main className="wide-shell">
      <section className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Circles</h1>
            <p className="muted mt-2">
              Join transformation spaces built around the kind of change you are
              making.
            </p>
          </div>

          {currentUserId && (
            <Link href="/circles/new" className="btn-primary">
              Create Circle
            </Link>
          )}
        </div>

        {currentUserId && (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className={filter === "all" ? "btn-primary" : "btn-secondary"}
              onClick={() => setFilter("all")}
            >
              All Circles ({circles.length})
            </button>
            <button
              type="button"
              className={filter === "joined" ? "btn-primary" : "btn-secondary"}
              onClick={() => setFilter("joined")}
            >
              Joined ({joinedCount})
            </button>
            <button
              type="button"
              className={
                filter === "created" ? "btn-primary" : "btn-secondary"
              }
              onClick={() => setFilter("created")}
            >
              Created ({createdCount})
            </button>
          </div>
        )}

        {notice && (
          <p className={`notice notice-${notice.type} mt-4`}>
            {notice.message}
          </p>
        )}
      </section>

      {filteredCircles.length === 0 ? (
        <div className="panel">
          <p className="font-semibold">{emptyMessage}</p>
          <p className="muted mt-2 text-sm">
            Circles are where people gather around a shared kind of change.
            Create one when you are ready to lead the room.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredCircles.map((circle) => {
            const isJoined = joinedCircleIds.has(circle.id);
            const isCreator = Boolean(
              currentUserId && currentUserId === circle.created_by,
            );

            return (
              <article key={circle.id} className="panel">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/circles/${circle.slug}`}
                      className="font-semibold"
                    >
                      {circle.name}
                    </Link>
                    {circle.category && (
                      <p className="muted mt-1 text-sm">{circle.category}</p>
                    )}
                    {isCreator && (
                      <span className="metric-pill mt-2 inline-flex text-xs">
                        Your Circle
                      </span>
                    )}
                  </div>

                  {currentUserId && (
                    <button
                      onClick={() => toggleMembership(circle)}
                      className={isJoined ? "btn-secondary" : "btn-primary"}
                      disabled={workingCircleId === circle.id}
                    >
                      {isJoined ? "Joined" : "Join"}
                    </button>
                  )}
                </div>

                {circle.description && (
                  <p className="mt-3 text-sm">{circle.description}</p>
                )}

                <div className="muted mt-3 flex gap-3 text-xs">
                  <span>
                    {circle.member_count}{" "}
                    {circle.member_count === 1 ? "member" : "members"}
                  </span>
                  <span>
                    {circle.journey_count}{" "}
                    {circle.journey_count === 1 ? "journey" : "journeys"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
