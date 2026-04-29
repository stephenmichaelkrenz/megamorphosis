"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/forgot-password");
        return;
      }

      setCheckingSession(false);
    };

    void checkSession();
  }, [router]);

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setSaving(false);
      alert(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  if (checkingSession) {
    return <main className="narrow-shell">Checking reset session...</main>;
  }

  return (
    <main className="narrow-shell">
      <h1 className="mb-3 text-2xl font-bold">Choose New Password</h1>
      <p className="muted mb-6 text-sm">
        Use at least 8 characters for your new Megamorphosis password.
      </p>

      <form onSubmit={handleUpdate}>
        <input
          className="field mb-3"
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <input
          className="field mb-4"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          required
        />

        <button disabled={saving} className="btn-primary" type="submit">
          {saving ? "Saving..." : "Update Password"}
        </button>
      </form>
    </main>
  );
}
