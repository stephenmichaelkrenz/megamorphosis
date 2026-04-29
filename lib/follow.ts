import { supabase } from "./supabaseClient";

export const followUser = async (targetUserId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("You must be logged in to follow users.") };
  }

  if (user.id === targetUserId) {
    return { error: new Error("You cannot follow yourself.") };
  }

  const { error } = await supabase.from("follows").insert({
    follower_id: user.id,
    following_id: targetUserId,
  });

  return { error };
};

export const unfollowUser = async (targetUserId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("You must be logged in to unfollow users.") };
  }

  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", user.id)
    .eq("following_id", targetUserId);

  return { error };
};
