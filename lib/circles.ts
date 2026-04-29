import { supabase } from "./supabaseClient";

export const formatCircleSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

export const joinCircle = async (
  circleId: string,
  currentUserId?: string | null,
) => {
  let userId = currentUserId;

  if (userId === undefined) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) {
    return { error: new Error("You must be logged in to join circles.") };
  }

  const { error } = await supabase.from("circle_members").insert({
    circle_id: circleId,
    user_id: userId,
    role: "member",
  });

  return { error };
};

export const leaveCircle = async (
  circleId: string,
  currentUserId?: string | null,
) => {
  let userId = currentUserId;

  if (userId === undefined) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) {
    return { error: new Error("You must be logged in to leave circles.") };
  }

  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .eq("role", "member");

  return { error };
};

export const attachJourneyToCircle = async ({
  circleId,
  journeyId,
  currentUserId,
}: {
  circleId: string;
  journeyId: string;
  currentUserId?: string | null;
}) => {
  let userId = currentUserId;

  if (userId === undefined) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  }

  if (!userId) {
    return { error: new Error("You must be logged in to attach journeys.") };
  }

  const { error } = await supabase.from("circle_journeys").insert({
    circle_id: circleId,
    journey_id: journeyId,
    user_id: userId,
  });

  return { error };
};

export const detachJourneyFromCircle = async ({
  circleId,
  journeyId,
}: {
  circleId: string;
  journeyId: string;
}) => {
  const { error } = await supabase
    .from("circle_journeys")
    .delete()
    .eq("circle_id", circleId)
    .eq("journey_id", journeyId);

  return { error };
};
