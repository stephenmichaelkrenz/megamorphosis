"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatCircleSlug, joinCircle } from "@/lib/circles";
import { supabase } from "@/lib/supabaseClient";

const defaultCheckinPrompt = "What is one move you are making today?";

const circleCreateErrorMessage = (message: string, code?: string) => {
  if (code === "23505" || message.toLowerCase().includes("duplicate")) {
    return "That Circle URL is already taken. Try a more specific slug.";
  }

  return message;
};

export default function NewCirclePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [checkinPrompt, setCheckinPrompt] = useState(defaultCheckinPrompt);
  const [saving, setSaving] = useState(false);

  const suggestedSlug = useMemo(() => formatCircleSlug(name), [name]);
  const finalSlug = formatCircleSlug(slug || suggestedSlug);

  const createCircle = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedCategory = category.trim();
    const trimmedCheckinPrompt = checkinPrompt.trim();

    if (!trimmedName) {
      alert("Circle name is required.");
      return;
    }

    if (finalSlug.length < 3) {
      alert("Circle URL must be at least 3 characters.");
      return;
    }

    if (!trimmedCheckinPrompt) {
      alert("Check-in prompt is required.");
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      alert("You must be logged in to create a Circle.");
      return;
    }

    const { data, error } = await supabase
      .from("circles")
      .insert({
        name: trimmedName,
        slug: finalSlug,
        category: trimmedCategory,
        description: trimmedDescription,
        checkin_prompt: trimmedCheckinPrompt,
        created_by: user.id,
        is_public: true,
      })
      .select("id, slug")
      .single();

    if (error) {
      setSaving(false);
      alert(circleCreateErrorMessage(error.message, error.code));
      return;
    }

    await joinCircle(data.id, user.id);
    router.push(`/circles/${data.slug}`);
  };

  return (
    <main className="page-shell">
      <section className="mb-8">
        <Link href="/circles" className="muted text-sm font-semibold">
          Back to Circles
        </Link>
        <h1 className="mt-3 text-3xl font-bold">Create Circle</h1>
        <p className="muted mt-2">
          Start a focused transformation space with a clear name and purpose.
        </p>
      </section>

      <section className="panel">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Name</span>
          <input
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Creative Discipline"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold">URL Slug</span>
          <input
            className="field"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            placeholder={suggestedSlug || "creative-discipline"}
          />
          <p className="muted mt-2 text-xs">
            /circles/{finalSlug || "..."} - Circle URLs stay fixed after
            creation.
          </p>
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold">Category</span>
          <input
            className="field"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Creativity"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold">Description</span>
          <textarea
            className="field h-28 resize-none"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="A place for daily creative practice, project momentum, and proof of work."
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-semibold">
            Check-In Prompt
          </span>
          <input
            className="field"
            value={checkinPrompt}
            onChange={(event) => setCheckinPrompt(event.target.value)}
            placeholder={defaultCheckinPrompt}
          />
          <p className="muted mt-2 text-xs">
            Members answer this when they post a Circle check-in.
          </p>
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-primary"
            disabled={saving}
            onClick={createCircle}
          >
            {saving ? "Creating..." : "Create Circle"}
          </button>
          <Link href="/circles" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </section>
    </main>
  );
}
