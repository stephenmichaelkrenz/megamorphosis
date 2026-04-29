import { Tables } from "@/lib/database.types";

export type Circle = Tables<"circles">;

export type CircleCheckin = Tables<"circle_checkins">;

export type CircleJourney = Tables<"circle_journeys">;

export type CircleMember = Tables<"circle_members">;

export type DirectMessage = Tables<"direct_messages">;

export type Follow = Tables<"follows">;

export type Journey = Tables<"journeys">;

export type JourneyStatus = "active" | "paused" | "completed";

export type JourneyVisibility = "public" | "unlisted" | "private";

export type JourneyMilestone = Tables<"journey_milestones">;

export type JourneyUpdate = Tables<"journey_updates">;

export type JourneyUpdateComment = Tables<"journey_update_comments">;

export type Post = Tables<"posts">;

export type PostComment = Tables<"post_comments">;

export type Profile = Tables<"profiles">;

export type Respect = Tables<"respects">;

export type RespectTargetType = "post" | "journey_update";

export type Notification = Tables<"notifications"> & {
  type: "follow" | "respect" | "comment" | "circle_checkin" | "direct_message";
  target_type:
    | "profile"
    | RespectTargetType
    | "comment"
    | "post_comment"
    | "circle_checkin"
    | "direct_message";
};

export type PlatformModerator = Tables<"platform_moderators">;
