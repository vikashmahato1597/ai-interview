"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { UserRole } from "@/lib/interview/types";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("interviewer");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createSupabaseBrowserClient();

      if (isSignUp) {
        const signUpResponse = await fetch("/api/auth/sign-up", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName,
            email,
            password,
            role,
          }),
        });
        const signUpData = (await signUpResponse.json()) as {
          error?: string;
        };

        if (!signUpResponse.ok) {
          throw new Error(signUpData.error ?? "Unable to create account.");
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        setMessage("Account created successfully.");
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Authentication failed.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-[2rem] p-6 sm:p-8">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-[var(--color-accent-strong)]">
        {isSignUp ? "Create account" : "Welcome back"}
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-white">
        {isSignUp ? "Set up your interviewer workspace." : "Sign in to PulseHire AI."}
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">
        {isSignUp
          ? "Create an interviewer account and continue directly without email confirmation."
          : "Open your dashboard, launch new interview links, and review AI feedback."}
      </p>

      <div className="mt-8 space-y-4">
        {isSignUp ? (
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Full name</span>
            <input
              required
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
              placeholder="Hiring manager or recruiter"
            />
          </label>
        ) : null}

        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
            placeholder="name@company.com"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-slate-300">Password</span>
          <input
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
            placeholder="Minimum 8 characters recommended"
          />
        </label>

        {isSignUp ? (
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Role</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-white outline-none transition focus:border-[var(--color-accent)]"
            >
              <option value="interviewer">Interviewer</option>
              <option value="candidate">Candidate</option>
            </select>
          </label>
        ) : null}
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {message ? (
        <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 w-full rounded-full bg-[var(--color-accent)] px-5 py-3 font-semibold text-slate-950 transition hover:bg-[var(--color-accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Working..." : isSignUp ? "Create account" : "Sign in"}
      </button>

      <p className="mt-6 text-sm text-slate-300">
        {isSignUp ? "Already have an account?" : "Need an account?"}{" "}
        <Link
          href={isSignUp ? "/sign-in" : "/sign-up"}
          className="font-semibold text-[var(--color-accent-strong)]"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
