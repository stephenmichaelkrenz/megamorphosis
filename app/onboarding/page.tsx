"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import {
  isValidUsername,
  normalizeUsername,
  usernameValidationMessage,
} from "@/lib/username";

export default function OnboardingPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  // Get current user
  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      const currentUser = data.user;

      if (!currentUser) {
        router.push("/auth/signup");
        return;
      }

      setUser(currentUser);
      setLoading(false);
    };

    void loadUser();
  }, [router]);

  const handleSubmit = async () => {
    if (!user) {
      alert("No user found");
      return;
    }

    const normalizedUsername = normalizeUsername(username);

    if (!isValidUsername(normalizedUsername)) {
      alert(usernameValidationMessage);
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        username: normalizedUsername,
        display_name: displayName.trim(),
        bio: bio.trim(),
        onboarded: true,
      })
      .select();

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    void fetch("/api/email/welcome", { method: "POST" }).catch(() => {
      // Email should never block the first-run path.
    });

    router.push("/welcome");
  };

  if (loading) {
    return <main className="page-shell">Loading...</main>;
  }

  return (
    <main className="page-shell">
      <p className="muted mb-2 text-sm font-semibold">Step 1 of 2</p>
      <h1 className="mb-3 text-2xl font-bold">Complete Your Profile</h1>
      <p className="muted mb-6 text-sm">
        Pick the public identity people will recognize, then Megamorphosis will
        help you post your first check-in.
      </p>

      <input
        className="field mb-3"
        placeholder="Username, e.g. stephen"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <p className="muted -mt-2 mb-3 text-xs">
        Use 3-24 lowercase letters, numbers, or underscores. This becomes your
        public /user/username URL.
      </p>

      <input
        className="field mb-3"
        placeholder="Display Name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />

      <textarea
        className="field mb-4 h-28 resize-none"
        placeholder="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      />

      <button onClick={handleSubmit} disabled={saving} className="btn-primary">
        {saving ? "Saving..." : "Continue"}
      </button>
    </main>
  );
}
