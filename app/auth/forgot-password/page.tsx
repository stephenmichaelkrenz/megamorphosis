"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/auth/callback?next=/auth/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSent(true);
  };

  return (
    <main className="narrow-shell">
      <h1 className="mb-3 text-2xl font-bold">Reset Password</h1>
      <p className="muted mb-6 text-sm">
        Enter your email and Megamorphosis will send you a secure reset link.
      </p>

      {sent ? (
        <div className="panel">
          <p className="font-semibold">Check your email.</p>
          <p className="muted mt-2 text-sm">
            If an account exists for that address, a password reset link is on
            the way.
          </p>
          <Link href="/auth/login" className="btn-secondary mt-4 inline-block">
            Back to Log In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleReset}>
          <input
            className="field mb-4"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <button disabled={loading} className="btn-primary" type="submit">
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}
    </main>
  );
}
