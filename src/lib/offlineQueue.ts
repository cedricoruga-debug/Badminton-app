"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { advanceGameStatus, finishGameWithWinner, markPaid } from "@/app/actions";

/**
 * Offline resilience — first pass (see the "Offline resilience" item in the
 * ShuttleFlow research doc). Full offline mode (their queue master view
 * keeps working via local storage and catches up on reconnect) is a bigger
 * architectural change than fits here: Next.js Server Actions need an
 * actual round trip to the server, so nothing genuinely "runs" offline.
 * What this DOES do: if wifi drops mid-session, the two actions most
 * likely to matter in the moment — advancing a game's status and marking a
 * payment — get queued in localStorage instead of just failing, a banner
 * says so, and they're replayed automatically the moment connectivity
 * comes back (checked both via the browser's online/offline events AND an
 * actual ping, since `navigator.onLine` alone just means "has a network
 * interface," not "can reach the app" — see /api/ping).
 *
 * Deliberately NOT queued: creating/editing/deleting a game or player,
 * changing session costs, etc. — those are rarer, more consequential to
 * get wrong from stale local state, and not the "keep the queue moving"
 * actions a game day actually needs mid-outage.
 */

type QueuedAction =
  | { id: string; kind: "advanceGameStatus"; label: string; queuedAt: number; args: [gameId: string, currentStatus: string] }
  | { id: string; kind: "markPaid"; label: string; queuedAt: number; args: [playerSessionId: string, method: "Cash" | "Gcash"] }
  | {
      id: string;
      kind: "finishGameWithWinner";
      label: string;
      queuedAt: number;
      args: [gameId: string, winnerTeam: "team1" | "team2"];
    };

const STORAGE_KEY = "badminton-offline-queue-v1";

function readQueue(): QueuedAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
  } catch {
    // Corrupt/unavailable storage — treat as empty rather than crash the
    // whole app over a queue that was only ever a nice-to-have.
    return [];
  }
}

function writeQueue(queue: QueuedAction[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full/blocked — the action already ran in memory for this
    // tab; it just won't survive a reload. Not worth surfacing an error
    // for.
  }
}

// Plain module-level state + a tiny pub-sub, wired to React via
// useSyncExternalStore — this needs to be read from multiple independent
// components (the banner, each row that queues an action) without wrapping
// the whole app in a context provider for what's a pretty small feature.
let queue: QueuedAction[] = typeof window !== "undefined" ? readQueue() : [];
let isFlushing = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function setQueue(next: QueuedAction[]) {
  queue = next;
  writeQueue(queue);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return queue;
}

function getServerSnapshot(): QueuedAction[] {
  return [];
}

/** Live-updating list of whatever's currently queued (empty most of the
 * time). Used by the offline banner to show a count. */
export function useOfflineQueue(): QueuedAction[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Tracks whether the app can currently reach the server — browser
 * online/offline events for the fast path, plus a periodic real ping (see
 * module comment above) since a dead wifi router can leave the device
 * "online" with nowhere to actually go. Also triggers a queue flush the
 * moment it flips back to true.
 */
export function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function ping(): Promise<boolean> {
      if (typeof navigator !== "undefined" && !navigator.onLine) return false;
      try {
        const res = await fetch("/api/ping", { cache: "no-store" });
        return res.ok;
      } catch {
        return false;
      }
    }

    async function check() {
      const ok = await ping();
      if (cancelled) return;
      setIsOnline(ok);
      if (ok) flushQueue();
    }

    check();
    const interval = setInterval(check, 15000);
    window.addEventListener("online", check);
    window.addEventListener("offline", check);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("online", check);
      window.removeEventListener("offline", check);
    };
  }, []);

  return isOnline;
}

/** Replays whatever's queued, in order, stopping at the first failure
 * (almost always "still actually offline" despite the ping that triggered
 * this) rather than skipping ahead and getting out of order. */
export async function flushQueue() {
  if (isFlushing) return;
  isFlushing = true;
  try {
    while (queue.length > 0) {
      const next = queue[0];
      try {
        await runQueuedAction(next);
      } catch {
        // Left in place — the next successful flush (next reconnect, or
        // the periodic retry) will try it again.
        break;
      }
      setQueue(queue.slice(1));
    }
  } finally {
    isFlushing = false;
  }
}

function runQueuedAction(action: QueuedAction) {
  switch (action.kind) {
    case "advanceGameStatus":
      return advanceGameStatus(...action.args);
    case "markPaid":
      return markPaid(...action.args);
    case "finishGameWithWinner":
      return finishGameWithWinner(...action.args);
  }
}

function enqueue(action: QueuedAction) {
  setQueue([...queue, action]);
}

/**
 * Drop-in replacement for calling `advanceGameStatus` directly: runs it
 * immediately if the device looks online, otherwise queues it for later.
 * `isOnline` is passed in (from useIsOnline in the calling component)
 * rather than re-checked here, so the UI and the actual dispatch decision
 * always agree on the current status.
 */
export function queueableAdvanceGameStatus(isOnline: boolean, gameId: string, currentStatus: string) {
  if (isOnline) return advanceGameStatus(gameId, currentStatus);
  enqueue({
    id: crypto.randomUUID(),
    kind: "advanceGameStatus",
    label: "Game update",
    queuedAt: Date.now(),
    args: [gameId, currentStatus],
  });
  return Promise.resolve();
}

/** Drop-in replacement for calling `markPaid` directly — see
 * queueableAdvanceGameStatus above. */
export function queueableMarkPaid(isOnline: boolean, playerSessionId: string, method: "Cash" | "Gcash") {
  if (isOnline) return markPaid(playerSessionId, method);
  enqueue({
    id: crypto.randomUUID(),
    kind: "markPaid",
    label: "Payment",
    queuedAt: Date.now(),
    args: [playerSessionId, method],
  });
  return Promise.resolve();
}

/** Drop-in replacement for calling `finishGameWithWinner` directly — see
 * queueableAdvanceGameStatus above. Backs CourtBox's tap-a-side-to-win
 * shortcut, so it needs the same offline safety net as the rest of a game's
 * status changes. */
export function queueableFinishGameWithWinner(
  isOnline: boolean,
  gameId: string,
  winnerTeam: "team1" | "team2"
) {
  if (isOnline) return finishGameWithWinner(gameId, winnerTeam);
  enqueue({
    id: crypto.randomUUID(),
    kind: "finishGameWithWinner",
    label: "Game result",
    queuedAt: Date.now(),
    args: [gameId, winnerTeam],
  });
  return Promise.resolve();
}
