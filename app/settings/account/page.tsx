"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type AccountProfile = {
  email_digest_enabled: boolean;
};

export default function AccountSettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDigest, setSavingDigest] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const loadAccount = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?next=/settings/account");
        return;
      }

      setEmail(user.email ?? null);

      const { data, error } = await supabase
        .from("profiles")
        .select("email_digest_enabled")
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
        email_digest_enabled: data.email_digest_enabled ?? true,
      });
      setLoading(false);
    };

    void loadAccount();
  }, [router]);

  const saveDigestPreference = async (enabled: boolean) => {
    setSavingDigest(true);
    setNotice(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login?next=/settings/account");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ email_digest_enabled: enabled })
      .eq("id", user.id);

    setSavingDigest(false);

    if (error) {
      alert(error.message);
      return;
    }

    setProfile({ email_digest_enabled: enabled });
    setNotice("Email preference saved.");
  };

  const sendPasswordReset = async () => {
    if (!email) return;

    setSendingReset(true);
    setNotice(null);

    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/auth/callback?next=/auth/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setSendingReset(false);

    if (error) {
      alert(error.message);
      return;
    }

    setNotice("Password reset email sent.");
  };

  const signOutEverywhere = async () => {
    setSigningOut(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });

    if (error) {
      setSigningOut(false);
      alert(error.message);
      return;
    }

    router.push("/auth/login");
    router.refresh();
  };

  if (loading) {
    return <main className="page-shell">Loading account settings...</main>;
  }

  if (!profile) {
    return <main className="page-shell">Account settings not found.</main>;
  }

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="muted mt-1 text-sm">{email ?? "Signed in account"}</p>
        </div>
        <Link href="/settings/profile" className="btn-secondary">
          Profile Settings
        </Link>
      </div>

      {notice && <p className="panel mb-6 text-sm font-semibold">{notice}</p>}

      <section className="panel mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Email Digest</h2>
            <p className="muted mt-1 text-sm">
              Daily digest emails send only when comments or direct messages are
              unread.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={profile.email_digest_enabled}
              disabled={savingDigest}
              onChange={(event) => {
                void saveDigestPreference(event.target.checked);
              }}
            />
            Enabled
          </label>
        </div>
      </section>

      <section className="panel mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Password</h2>
            <p className="muted mt-1 text-sm">
              Send a secure password reset link to your account email.
            </p>
          </div>
          <button
            className="btn-secondary"
            disabled={sendingReset || !email}
            onClick={sendPasswordReset}
          >
            {sendingReset ? "Sending..." : "Send Reset Link"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold">Sessions</h2>
            <p className="muted mt-1 text-sm">
              Sign out of Megamorphosis on every device.
            </p>
          </div>
          <button
            className="btn-secondary"
            disabled={signingOut}
            onClick={signOutEverywhere}
          >
            {signingOut ? "Signing out..." : "Sign Out Everywhere"}
          </button>
        </div>
      </section>
    </main>
  );
}

