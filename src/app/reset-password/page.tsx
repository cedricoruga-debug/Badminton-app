"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Landing page from the emailed reset link (via /auth/callback, which has
 * already signed the visitor in) — choose a new password. */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/");
    router.refresh();
  }

  const input =
    "w-full rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/20";

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-brand p-4">
      <div aria-hidden className="court-lines absolute inset-0 -z-10 opacity-60" />
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-[0_30px_60px_-20px_rgba(23,42,35,0.6)]">
        <h1 className="text-2xl font-extrabold text-brand-dark">Choose a new password</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input type="password" required autoFocus autoComplete="new-password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
          <input type="password" required autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-full btn-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
            {loading ? "Saving…" : "Save and continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
