"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { safeRedirectPath } from "@/lib/redirect";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    const nextPath = safeRedirectPath(
      new URLSearchParams(window.location.search).get("next"),
    );
    router.push(nextPath);
    router.refresh();
  };

  return (
    <main className="narrow-shell">
      <h1 className="mb-6 text-2xl font-bold">Log In</h1>

      <form onSubmit={handleLogin}>
        <input
          className="field mb-3"
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <input
          className="field mb-4"
          type="password"
          placeholder="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />

        <button disabled={loading} className="btn-primary" type="submit">
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <div className="mt-5 space-y-2 text-sm">
        <Link href="/auth/forgot-password" className="font-semibold">
          Forgot your password?
        </Link>
        <p className="muted">
          New here?{" "}
          <Link href="/auth/signup" className="font-semibold">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
