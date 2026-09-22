"use client";

import { useIsOnline, useOfflineQueue } from "@/lib/offlineQueue";

/**
 * Sits at the top of the page, under the header — only visible when it has
 * something to say (offline, or catching up right after reconnecting).
 * See src/lib/offlineQueue.ts for what's actually queued/replayed.
 */
export function OfflineBanner() {
  const isOnline = useIsOnline();
  const queue = useOfflineQueue();

  if (isOnline && queue.length === 0) return null;

  return (
    <div
      className={`flex-none px-4 py-1.5 text-center text-xs font-medium text-white ${
        isOnline ? "bg-amber-500" : "bg-black/70"
      }`}
    >
      {isOnline
        ? `Back online — syncing ${queue.length} pending update${queue.length === 1 ? "" : "s"}…`
        : queue.length > 0
          ? `You're offline — ${queue.length} update${queue.length === 1 ? "" : "s"} will send once you're back.`
          : "You're offline — some actions will be saved and sent once you're back."}
    </div>
  );
}
