"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * "Forgot password" for club owners (they signed up with a real email).
 * Staff username accounts have no real inbox — their admin resets their
 * password from the Accounts page instead, which this page says too.
 */
function ForgotPasswordForm() {
  const expired = useSearchParams().get("expired") === "1";
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = email.trim().toLowerCase();
    if (!value.includes("@")) {
      setError("Enter the email you signed up with. Staff accounts: ask your club admin to reset your password.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(value, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-brand p-4">
      <div aria-hidden className="court-lines absolute inset-0 -z-10 opacity-60" />
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-5 block text-center text-xl font-extrabold tracking-tight text-white">
          KRO5
        </Link>
        <div className="rounded-3xl bg-white p-7 shadow-[0_30px_60px_-20px_rgba(23,42,35,0.6)]">
          <h1 className="text-2xl font-extrabold text-brand-dark">Reset your password</h1>
          {sent ? (
            <p className="mt-3 text-sm font-medium text-brand-dark/70">
              If there&apos;s an account for <strong>{email}</strong>, a reset link is on its way. Check your inbox
              (and spam folder).
            </p>
          ) : (
            <>
              <p className="mb-6 mt-1 text-sm font-medium text-brand-dark/55">
                {expired
                  ? "That link has expired or was already used — request a new one."
                  : "We'll email you a link to set a new password."}
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/20"
                />
                {error && <p className="text-sm font-medium text-red-600">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-full btn-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
              <p className="mt-4 text-xs text-black/40">
                Signing in with a username? Your club admin can reset it from the Accounts page.
              </p>
            </>
          )}
        </div>
        <p className="mt-5 text-center text-sm font-semibold text-white/90">
          <Link href="/login" className="underline underline-offset-2 hover:text-white">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
