"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { IconPickleball, IconShuttle } from "@/app/components/icons";
import { signUpClub, type SignupResult } from "./actions";

const SPORTS = [
  {
    value: "badminton" as const,
    label: "Badminton",
    blurb: "Doubles queue, rally to 21",
    Icon: IconShuttle,
  },
  {
    value: "pickleball" as const,
    label: "Pickleball",
    blurb: "Open play, games to 11",
    Icon: IconPickleball,
  },
];

export function SignupForm({ signedInEmail }: { signedInEmail: string | null }) {
  const [state, formAction, pending] = useActionState<SignupResult, FormData>(signUpClub, undefined);
  const [sport, setSport] = useState<"badminton" | "pickleball">("badminton");
  const finishingOnly = !!signedInEmail;
  const input =
    "w-full rounded-xl border border-black/15 px-3.5 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/20";

  return (
    <div className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-brand p-4 py-10">
      <div aria-hidden className="court-lines absolute inset-0 -z-10 opacity-60" />
      <div className="w-full max-w-md">
        <Link href="/" className="mb-5 flex items-center justify-center gap-2 text-white" aria-label="KRO5 home">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
            {sport === "pickleball" ? <IconPickleball className="h-6 w-6" /> : <IconShuttle className="h-6 w-6" />}
          </span>
          <span className="text-xl font-extrabold tracking-tight">KRO5</span>
        </Link>

        <div className="rounded-3xl bg-white p-7 shadow-[0_30px_60px_-20px_rgba(23,42,35,0.6)]">
          <h1 className="text-2xl font-extrabold text-brand-dark">
            {finishingOnly ? "Finish setting up your club" : "Create your club"}
          </h1>
          <p className="mb-6 mt-1 text-sm font-medium text-brand-dark/55">
            {finishingOnly
              ? `Signed in as ${signedInEmail}. Name your club to get started.`
              : "Free to start. Your club gets its own players, sessions, payments and staff logins."}
          </p>

          <form action={formAction} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-dark">Sport</label>
              <input type="hidden" name="sport" value={sport} />
              <div className="grid grid-cols-2 gap-2">
                {SPORTS.map(({ value, label, blurb, Icon }) => {
                  const active = sport === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSport(value)}
                      aria-pressed={active}
                      className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 text-left transition ${
                        active ? "border-brand bg-brand-light" : "border-black/10 hover:border-brand/40"
                      }`}
                    >
                      <Icon className={`h-6 w-6 ${active ? "text-brand" : "text-black/40"}`} />
                      <span className={`text-sm font-bold ${active ? "text-brand-dark" : "text-black/70"}`}>{label}</span>
                      <span className="text-[11px] leading-snug text-black/45">{blurb}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-brand-dark">Club name</label>
              <input
                type="text"
                name="club_name"
                required
                maxLength={60}
                placeholder={sport === "pickleball" ? "e.g. Dink Masters Cavite" : "e.g. Saturday Smashers"}
                className={input}
              />
            </div>

            {!finishingOnly && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-brand-dark">Your email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    className={input}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-brand-dark">Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className={input}
                  />
                  <p className="mt-1 text-xs text-black/40">At least 8 characters.</p>
                </div>
              </>
            )}

            {state?.error && <p className="text-sm font-medium text-red-600">{state.error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full btn-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? "Creating your club…" : "Create club"}
            </button>
          </form>

          {!finishingOnly && (
            <p className="mt-5 text-center text-xs text-black/40">
              After this you can add your queue staff as simple username logins from the Accounts page.
            </p>
          )}
        </div>

        {!finishingOnly && (
          <p className="mt-5 text-center text-sm font-semibold text-white/90">
            Already have a club?{" "}
            <Link href="/login" className="underline underline-offset-2 hover:text-white">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
