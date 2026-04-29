"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UploadUpdateForm({
  journeyId,
  currentUserId,
  onPosted,
}: {
  journeyId: string;
  currentUserId: string | null;
  onPosted?: () => void;
}) {
  const [text, setText] = useState("");
  const [metricLabel, setMetricLabel] = useState("");
  const [metricValue, setMetricValue] = useState("");
  const [reflection, setReflection] = useState("");
  const [mood, setMood] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [posting, setPosting] = useState(false);

  const submitUpdate = async () => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      alert("Update text is required.");
      return;
    }

    setPosting(true);

    if (!currentUserId) {
      setPosting(false);
      return alert("Not logged in");
    }

    let finalImageUrl = imageUrl.trim() || null;

    if (imageFile) {
      if (!imageFile.type.startsWith("image/")) {
        setPosting(false);
        alert("Evidence upload must be an image.");
        return;
      }

      if (imageFile.size > 5 * 1024 * 1024) {
        setPosting(false);
        alert("Evidence image must be 5MB or smaller.");
        return;
      }

      const extension = imageFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
      const imagePath = `${currentUserId}/${crypto.randomUUID()}.${safeExtension}`;

      const { error: uploadError } = await supabase.storage
        .from("journey-update-images")
        .upload(imagePath, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setPosting(false);
        alert(uploadError.message);
        return;
      }

      const { data } = supabase.storage
        .from("journey-update-images")
        .getPublicUrl(imagePath);

      finalImageUrl = data.publicUrl;
    }

    const { error } = await supabase.from("journey_updates").insert({
      journey_id: journeyId,
      user_id: currentUserId,
      text: trimmedText,
      metric_label: metricLabel.trim() || null,
      metric_value: metricValue.trim() || null,
      reflection: reflection.trim() || null,
      mood: mood || null,
      next_step: nextStep.trim() || null,
      image_url: finalImageUrl,
    });

    if (error) {
      setPosting(false);
      return alert(error.message);
    }

    setText("");
    setMetricLabel("");
    setMetricValue("");
    setReflection("");
    setMood("");
    setNextStep("");
    setImageUrl("");
    setImageFile(null);
    setFileInputKey((key) => key + 1);
    setPosting(false);
    onPosted?.();
  };

  return (
    <div className="panel mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-heading">Post Update</h2>
          <p className="muted mt-1 text-sm">
            Capture progress, proof, and the next step while it is fresh.
          </p>
        </div>
      </div>
      <textarea
        className="field"
        placeholder="What changed?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          className="field"
          placeholder="Metric label, e.g. Weight"
          value={metricLabel}
          onChange={(e) => setMetricLabel(e.target.value)}
        />
        <input
          className="field"
          placeholder="Metric value, e.g. 218 lbs"
          value={metricValue}
          onChange={(e) => setMetricValue(e.target.value)}
        />
      </div>

      <textarea
        className="field mt-3 h-24 resize-none"
        placeholder="Reflection: what did you learn?"
        value={reflection}
        onChange={(e) => setReflection(e.target.value)}
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <select
          className="field"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
        >
          <option value="">Mood</option>
          <option value="energized">Energized</option>
          <option value="steady">Steady</option>
          <option value="challenged">Challenged</option>
          <option value="stuck">Stuck</option>
          <option value="proud">Proud</option>
        </select>
        <input
          className="field"
          placeholder="Next step"
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
        />
      </div>

      <input
        className="field mt-3"
        placeholder="Evidence image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
      />

      <label className="mt-3 block">
        <span className="mb-2 block text-sm font-semibold">
          Or upload evidence image
        </span>
        <input
          key={fileInputKey}
          type="file"
          accept="image/*"
          className="field"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <button
        onClick={submitUpdate}
        disabled={posting}
        className="btn-primary mt-2"
      >
        {posting ? "Posting..." : "Post Update"}
      </button>
    </div>
  );
}
