"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  FREE_PRIVATE_JOURNEY_LIMIT,
  isProTier,
} from "@/lib/subscription";
import { JourneyVisibility } from "@/types";

export default function NewJourney() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [goalText, setGoalText] = useState("");
  const [visibility, setVisibility] = useState<JourneyVisibility>("public");
  const [saving, setSaving] = useState(false);

  const createJourney = async () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      alert("Title is required.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login?next=/new-journey");
      return;
    }

    if (visibility === "private") {
      const [{ data: profile }, { count: privateJourneyCount }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("subscription_tier")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("journeys")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("visibility", "private")
            .is("archived_at", null),
        ]);

      if (
        !isProTier(profile?.subscription_tier) &&
        (privateJourneyCount ?? 0) >= FREE_PRIVATE_JOURNEY_LIMIT
      ) {
        setSaving(false);
        alert("Free accounts can keep 1 active private journey. Pro removes this limit.");
        return;
      }
    }

    const { data, error } = await supabase
      .from("journeys")
      .insert({
        user_id: user.id,
        title: trimmedTitle,
        category: category.trim(),
        goal_text: goalText.trim(),
        status: "active",
        visibility,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    router.push(`/journey/${data.id}`);
    router.refresh();
  };

  return (
    <main className="page-shell">
      <h1 className="mb-1 text-2xl font-bold">New Journey</h1>
      <p className="muted mb-6">Name the transformation you want to make visible.</p>

      <input
        className="field mb-3"
        placeholder="Title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />

      <input
        className="field mb-3"
        placeholder="Category"
        value={category}
        onChange={(event) => setCategory(event.target.value)}
      />

      <textarea
        className="field h-28 resize-none"
        placeholder="Goal"
        value={goalText}
        onChange={(event) => setGoalText(event.target.value)}
      />

      <select
        className="field mt-3"
        value={visibility}
        onChange={(event) =>
          setVisibility(event.target.value as JourneyVisibility)
        }
      >
        <option value="public">Public</option>
        <option value="unlisted">Unlisted</option>
        <option value="private">Private</option>
      </select>
      <p className="muted mt-2 text-sm">
        Free accounts can keep {FREE_PRIVATE_JOURNEY_LIMIT} active private
        journey. Pro removes this limit.
      </p>

      <button
        onClick={createJourney}
        disabled={saving}
        className="btn-primary mt-4"
      >
        {saving ? "Creating..." : "Create"}
      </button>
    </main>
  );
}
