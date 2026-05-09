export type ReactionType = "respect" | "inspired" | "same" | "keep_going";

export type ReactionCounts = Partial<Record<ReactionType, number>>;

export const reactionOptions: {
  type: ReactionType;
  label: string;
  activeLabel: string;
}[] = [
  { type: "respect", label: "Respect", activeLabel: "Respected" },
  { type: "inspired", label: "Inspired", activeLabel: "Inspired" },
  { type: "same", label: "Same", activeLabel: "Same" },
  { type: "keep_going", label: "Keep going", activeLabel: "Keep going" },
];

export const emptyReactionCounts = (): ReactionCounts =>
  Object.fromEntries(reactionOptions.map((reaction) => [reaction.type, 0]));

export const reactionLabel = (type?: string | null) =>
  reactionOptions.find((reaction) => reaction.type === type)?.label ??
  "Respect";
