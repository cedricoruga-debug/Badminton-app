"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconPickleball, IconShuttle } from "@/app/components/icons";

/**
 * Sign-in page. Two kinds of login share one field:
 *  - club owners sign in with the real email they signed up with;
 *  - staff accounts (added from the Accounts page) sign in with a plain
 *    username — under the hood that's `<username>@badminton.local`, since
 *    Supabase Auth only knows "email" (a fake domain that never sends or
 *    receives mail).
 * Anything containing "@" is treated as an email, anything else as a
 * username.
 */
const USERNAME_DOMAIN = "@badminton.local";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const login = username.trim().toLowerCase();
    const email = login.includes("@") ? login : login + USERNAME_DOMAIN;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials" ? "Wrong email/username or password." : error.message
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-brand p-4">
      <div aria-hidden className="court-lines absolute inset-0 -z-10 opacity-60" />
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-5 flex items-center justify-center gap-2 text-white"
          aria-label="KRO5 home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <IconShuttle className="h-6 w-6" />
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            <IconPickleball className="h-6 w-6" />
          </span>
          <span className="text-xl font-extrabold tracking-tight">KRO5</span>
        </Link>

        <div className="rounded-3xl bg-white p-7 shadow-[0_30px_60px_-20px_rgba(23,42,35,0.6)]">
          <h1 className="text-2xl font-extrabold text-brand-dark">Welcome back</h1>
          <p className="mb-6 mt-1 text-sm font-medium text-brand-dark/55">Sign in to run your session.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-dark">Email or username</label>
              <input
                type="text"
                required
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/20"
              />
            </div>
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <label className="block text-sm font-semibold text-brand-dark">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/20"
              />
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full btn-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm font-semibold text-white/90">
          New queue master?{" "}
          <Link href="/signup" className="underline underline-offset-2 hover:text-white">
            Create your club
          </Link>
        </p>
        <p className="mt-2 text-center text-sm font-semibold text-white/90">
          Just here to play?{" "}
          <Link href="/join" className="underline underline-offset-2 hover:text-white">
            See the live queue
          </Link>
        </p>
      </div>
    </div>
  );
}
