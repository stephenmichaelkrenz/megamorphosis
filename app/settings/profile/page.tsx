"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  isValidUsername,
  normalizeUsername,
  usernameValidationMessage,
} from "@/lib/username";

type EditableProfile = {
  username: string;
  display_name: string;
  bio: string;
  email_digest_enabled: boolean;
};

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?next=/settings/profile");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, bio, email_digest_enabled")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        router.push("/onboarding");
        return;
      }

      setProfile({
        username: data.username ?? "",
        display_name: data.display_name ?? "",
        bio: data.bio ?? "",
        email_digest_enabled: data.email_digest_enabled ?? true,
      });
      setLoading(false);
    };

    void loadProfile();
  }, [router]);

  const saveProfile = async () => {
    if (!profile) return;

    const normalizedUsername = normalizeUsername(profile.username);

    if (!isValidUsername(normalizedUsername)) {
      alert(usernameValidationMessage);
      return;
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login?next=/settings/profile");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: normalizedUsername,
        display_name: profile.display_name.trim(),
        bio: profile.bio.trim(),
        email_digest_enabled: profile.email_digest_enabled,
        onboarded: true,
      })
      .eq("id", user.id);

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    router.push(`/user/${normalizedUsername}`);
    router.refresh();
  };

  if (loading) {
    return <main className="page-shell">Loading profile settings...</main>;
  }

  if (!profile) {
    return <main className="page-shell">Profile not found.</main>;
  }

  return (
    <main className="page-shell">
      <h1 className="mb-1 text-2xl font-bold">Edit Profile</h1>
      <p className="muted mb-6">Keep your public identity current.</p>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-semibold">Username</span>
        <input
          className="field"
          value={profile.username}
          onChange={(event) =>
            setProfile((current) =>
              current ? { ...current, username: event.target.value } : current,
            )
          }
        />
        <p className="muted mt-2 text-xs">
          3-24 lowercase letters, numbers, or underscores.
        </p>
      </label>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-semibold">Display Name</span>
        <input
          className="field"
          value={profile.display_name}
          onChange={(event) =>
            setProfile((current) =>
              current
                ? { ...current, display_name: event.target.value }
                : current,
            )
          }
        />
      </label>

      <label className="mb-4 block">
        <span className="mb-2 block text-sm font-semibold">Bio</span>
        <textarea
          className="field h-32 resize-none"
          value={profile.bio}
          onChange={(event) =>
            setProfile((current) =>
              current ? { ...current, bio: event.target.value } : current,
            )
          }
        />
      </label>

      <section className="panel mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Email Digest</h2>
            <p className="muted mt-1 text-sm">
              Receive a daily email only when you have unread comments or direct
              messages.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={profile.email_digest_enabled}
              onChange={(event) =>
                setProfile((current) =>
                  current
                    ? {
                        ...current,
                        email_digest_enabled: event.target.checked,
                      }
                    : current,
                )
              }
            />
            Enabled
          </label>
        </div>
      </section>

      <div className="flex gap-3">
        <button onClick={saveProfile} disabled={saving} className="btn-primary">
          {saving ? "Saving..." : "Save Profile"}
        </button>
        <button
          onClick={() => router.back()}
          disabled={saving}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </main>
  );
}
