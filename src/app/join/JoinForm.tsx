"use client";

import { useState, useTransition, type FormEvent } from "react";
import { submitJoinRequest } from "@/app/actions";
import { IconShuttle } from "@/app/components/icons";

/**
 * The public self-service join page — no login, reachable by anyone with
 * the link (see PUBLIC_PATHS in proxy.ts). A player enters the session's
 * 6-digit code (told to them by the queue master in person, or scanned off
 * the QR on the dashboard — see JoinQrSection, which links here with
 * ?code=… pre-filled) plus their name; it lands as a pending request the
 * queue master approves or declines from the dashboard's "Join requests"
 * panel — this page never registers anyone by itself. Modeled on the login
 * page's layout (centered card, no nav chrome) since it's the other page a
 * signed-out visitor can reach.
 */
export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitJoinRequest(code, name);
        setSentTo(result.sessionDate);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      }
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black/[0.02] p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-soft">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full btn-brand text-white">
            <IconShuttle className="h-6 w-6" />
          </span>
          <h1 className="text-lg font-semibold">Join a session</h1>
          <p className="text-center text-sm text-black/50">
            Enter the code the queue master gave you and your name.
          </p>
        </div>

        {sentTo ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-black/70">
              Request sent for{" "}
              <span className="font-semibold">
                {new Date(sentTo).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              . The queue master will approve you shortly — check in with them if it&apos;s been a while.
            </p>
            <button
              type="button"
              onClick={() => {
                setSentTo(null);
                setCode("");
                setName("");
              }}
              className="text-sm font-medium text-brand hover:underline"
            >
              Send another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand">Session code</label>
              <input
                type="text"
                inputMode="numeric"
                required
                // Scanning the QR already fills this in correctly — put the
                // cursor on the name field instead so there's one less tap.
                autoFocus={code.length !== 6}
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded border border-black/15 px-3 py-2 text-center text-lg tracking-[0.3em]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand">Your name</label>
              <input
                type="text"
                required
                autoFocus={code.length === 6}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-black/15 px-3 py-2 text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded btn-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {isPending ? "Sending…" : "Request to join"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
