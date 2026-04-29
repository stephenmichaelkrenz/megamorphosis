"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          typeof window === "undefined"
            ? undefined
            : `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    });

    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }

    if (data.session) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    setLoading(false);
    alert("Signup successful. Check your email to confirm your account, then log in.");
    router.push("/auth/login");
  };

  return (
    <main className="narrow-shell">
      <h1 className="mb-6 text-2xl font-bold">Sign Up</h1>

      <form onSubmit={handleSignup}>
        <input
          className="field mb-3"
          placeholder="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          className="field mb-4"
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button disabled={loading} className="btn-primary" type="submit">
          {loading ? "Signing up..." : "Sign Up"}
        </button>
      </form>

      <p className="muted mt-5 text-sm">
        By creating an account, you agree to the{" "}
        <Link href="/terms" className="font-semibold">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-semibold">
          Privacy
        </Link>
        .
      </p>
    </main>
  );
}
