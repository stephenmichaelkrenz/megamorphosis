"use client";

import { useState } from "react";
import {
  ReactionCounts,
  ReactionType,
  emptyReactionCounts,
  reactionOptions,
} from "@/lib/reactions";
import { supabase } from "@/lib/supabaseClient";
import { RespectTargetType } from "@/types";

export default function RespectButton({
  targetId,
  targetType,
  currentUserId,
  initialCount,
  initiallyRespected,
  initialReactionCounts,
  initiallyReactedTypes,
}: {
  targetId: string;
  targetType: RespectTargetType;
  currentUserId?: string | null;
  initialCount: number;
  initiallyRespected: boolean;
  initialReactionCounts?: ReactionCounts;
  initiallyReactedTypes?: ReactionType[];
}) {
  const [counts, setCounts] = useState<ReactionCounts>({
    ...emptyReactionCounts(),
    ...(initialReactionCounts ?? { respect: initialCount }),
  });
  const [reactedTypes, setReactedTypes] = useState<Set<ReactionType>>(
    new Set(
      initiallyReactedTypes ??
        (initiallyRespected ? (["respect"] as ReactionType[]) : []),
    ),
  );
  const [saving, setSaving] = useState(false);

  const toggleReaction = async (reactionType: ReactionType) => {
    setSaving(true);
    let actingUserId = currentUserId;

    if (actingUserId === undefined) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      actingUserId = user?.id ?? null;
    }

    if (!actingUserId) {
      setSaving(false);
      alert("Log in to react.");
      return;
    }

    if (reactedTypes.has(reactionType)) {
      const { error } = await supabase
        .from("respects")
        .delete()
        .eq("user_id", actingUserId)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .eq("reaction_type", reactionType);

      if (error) {
        setSaving(false);
        alert(error.message);
        return;
      }

      setReactedTypes((current) => {
        const next = new Set(current);
        next.delete(reactionType);
        return next;
      });
      setCounts((current) => ({
        ...current,
        [reactionType]: Math.max(0, (current[reactionType] ?? 0) - 1),
      }));
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("respects").insert({
      user_id: actingUserId,
      target_type: targetType,
      target_id: targetId,
      reaction_type: reactionType,
    });

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    setReactedTypes((current) => new Set(current).add(reactionType));
    setCounts((current) => ({
      ...current,
      [reactionType]: (current[reactionType] ?? 0) + 1,
    }));
    setSaving(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {reactionOptions.map((reaction) => {
        const isActive = reactedTypes.has(reaction.type);
        const count = counts[reaction.type] ?? 0;

        return (
          <button
            key={reaction.type}
            onClick={() => toggleReaction(reaction.type)}
            disabled={saving}
            className={
              isActive
                ? "btn-secondary metric-pill-success"
                : reaction.type === "respect"
                  ? "btn-primary"
                  : "btn-secondary"
            }
          >
            {isActive ? reaction.activeLabel : reaction.label} ({count})
          </button>
        );
      })}
    </div>
  );
}
