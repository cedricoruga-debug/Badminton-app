"use client";

import { useTransition } from "react";
import { backfillSessionJoinCode } from "@/app/actions";

/**
 * Shows the current session's 6-digit join code (what a player types into
 * /join, told to them in person) in the Details panel — or, for a session
 * created before this existed (join_code is nullable for exactly that
 * reason), a button to generate one on the spot.
 */
export function JoinCodeCard({ sessionId, joinCode }: { sessionId: string; joinCode: string | null }) {
  const [isPending, startTransition] = useTransition();

  if (!joinCode) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => backfillSessionJoinCode(sessionId))}
        className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
      >
        {isPending ? "Generating…" : "Generate join code"}
      </button>
    );
  }

  return <span className="font-mono text-base font-semibold tracking-[0.2em]">{joinCode}</span>;
}
