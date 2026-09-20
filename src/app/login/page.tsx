"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconShuttle } from "@/app/components/icons";

/**
 * Sign-in page — the one route `proxy.ts` always lets through. No public
 * sign-up here on purpose: accounts are created directly in the Supabase
 * dashboard (Authentication → Users) so the app stays closed to whoever
 * finds the link, rather than letting anyone self-register.
 *
 * Supabase Auth only knows "email", not "username" — so under the hood
 * each account's real login email is `<username>@badminton.local` (a fake
 * domain that never sends or receives real mail; Auto Confirm skips the
 * verification step). This page just asks for the username and appends
 * that domain before calling Supabase, so from the user's side it's a
 * plain username + password login. See DEPLOY.md for how to create
 * accounts with this convention.
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

    const email = username.trim().toLowerCase() + USERNAME_DOMAIN;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(
        error.message === "Invalid login credentials" ? "Wrong username or password." : error.message
      );
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black/[0.02] p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-soft">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full btn-brand text-white">
            <IconShuttle className="h-6 w-6" />
          </span>
          <h1 className="text-lg font-semibold">Queuing App by Ced</h1>
          <p className="text-sm text-black/50">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand">Username</label>
            <input
              type="text"
              required
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border border-black/15 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-black/15 px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded btn-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
