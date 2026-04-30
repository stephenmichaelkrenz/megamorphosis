export type SubscriptionTier = "free" | "pro";

export const FREE_PRIVATE_JOURNEY_LIMIT = 1;

export const isProTier = (tier?: string | null) => tier === "pro";
