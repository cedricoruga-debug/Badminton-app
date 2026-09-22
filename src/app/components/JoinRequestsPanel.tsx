"use client";

import { useTransition } from "react";
import { approveJoinRequest, declineJoinRequest } from "@/app/actions";
import { IconUserPlus } from "@/app/components/icons";
import type { JoinRequest } from "@/lib/types";

/**
 * Pending self-service join requests (from the public /join page) for the
 * current session — a banner above the main dashboard grid rather than its
 * own permanent section, since most of the time there's nothing here and an
 * empty panel taking up a grid slot would just be dead space. Only rendered
 * at all when `requests` is non-empty (see page.tsx).
 */
export function JoinRequestsPanel({ sessionId, requests }: { sessionId: string; requests: JoinRequest[] }) {
  return (
    <div className="mb-3 flex-none rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
        <IconUserPlus className="h-3.5 w-3.5" />
        {requests.length} player{requests.length === 1 ? "" : "s"} waiting to join
      </p>
      <ul className="space-y-1.5">
        {requests.map((req) => (
          <JoinRequestRow key={req.id} sessionId={sessionId} request={req} />
        ))}
      </ul>
    </div>
  );
}

function JoinRequestRow({ sessionId, request }: { sessionId: string; request: JoinRequest }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
      <span className="min-w-0 truncate text-sm font-medium">{request.player_name}</span>
      <div className="flex flex-none items-center gap-1.5">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(() => approveJoinRequest(request.id, sessionId, request.player_name))
          }
          className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => declineJoinRequest(request.id))}
          className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-black/50 transition-colors hover:bg-black/10 disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </li>
  );
}
