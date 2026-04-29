"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { RespectTargetType } from "@/types";

export default function RespectButton({
  targetId,
  targetType,
  currentUserId,
  initialCount,
  initiallyRespected,
}: {
  targetId: string;
  targetType: RespectTargetType;
  currentUserId?: string | null;
  initialCount: number;
  initiallyRespected: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [respected, setRespected] = useState(initiallyRespected);
  const [saving, setSaving] = useState(false);

  const toggleRespect = async () => {
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
      alert("Log in to show respect.");
      return;
    }

    if (respected) {
      const { error } = await supabase
        .from("respects")
        .delete()
        .eq("user_id", actingUserId)
        .eq("target_type", targetType)
        .eq("target_id", targetId);

      if (error) {
        setSaving(false);
        alert(error.message);
        return;
      }

      setRespected(false);
      setCount((current) => Math.max(0, current - 1));
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("respects").insert({
      user_id: actingUserId,
      target_type: targetType,
      target_id: targetId,
    });

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    setRespected(true);
    setCount((current) => current + 1);
    setSaving(false);
  };

  return (
    <button
      onClick={toggleRespect}
      disabled={saving}
      className={respected ? "btn-secondary" : "btn-primary"}
    >
      {respected ? "Respected" : "Respect"} ({count})
    </button>
  );
}
