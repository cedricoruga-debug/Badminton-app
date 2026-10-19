"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClubProvider } from "@/app/components/ClubContext";
import { OfflineBanner } from "@/app/components/OfflineBanner";
import { SidePanel } from "@/app/components/SidePanel";
import { registerServiceWorker } from "@/lib/registerSW";
import { createClient } from "@/lib/supabase/client";
import type { AppSettings } from "@/lib/types";


/** Every table a page on this site reads from — a change to any of them
 * could be showing on someone else's screen right now. */
const WATCHED_TABLES = ["players", "sessions", "games", "player_sessions", "clubs"] as const;

/** If several rows change at once (e.g. saving a game touches both `games`
 * and `player_sessions`), coalesce them into one refresh instead of one per
 * row. */
const COALESCE_MS = 400;

/** Belt-and-suspenders minimum gap between refocus-triggered refreshes —
 * only matters if Realtime itself is unreachable (see below). */
const MIN_MS_BETWEEN_REFOCUS_REFRESH = 5000;

/**
 * Poll fallback cadence. Every poll is a full server re-render of the page
 * on Vercel (router.refresh), so this is the single most expensive thing
 * the app does — the old flat 8s poll on every open tab burned most of the
 * Vercel Hobby CPU allowance on game days.
 *
 * - While Realtime is NOT connected: poll fairly quickly, since it's the
 *   only thing keeping the screen fresh.
 * - While Realtime IS connected: it already pushes every change instantly,
 *   and supabase-js's own heartbeat (~25s) notices a quietly-dead socket
 *   and reconnects — which triggers mechanism #2's catch-up refresh. So
 *   only a slow safety net is needed.
 */
const POLL_MS_REALTIME_DOWN = 15_000;
const POLL_MS_REALTIME_UP = 120_000;
/** How often the poll timer wakes to decide whether a refresh is due —
 * cheap, client-only, no network unless a refresh is actually due. */
const POLL_TICK_MS = 5_000;

/**
 * Keeps the current page's data in sync with everyone else's — the whole
 * reason this exists is "I deleted something on my phone and my laptop
 * didn't notice." Four mechanisms, layered:
 *
 * 1. Supabase Realtime: subscribes to every table the app reads from and
 *    re-fetches the page the moment any row changes, anywhere — including
 *    changes made on this same device, since a Server Action's
 *    `revalidatePath` only clears the *server's* cache, it doesn't push
 *    anything to browser tabs that already have the page open. Requires
 *    Realtime to be turned on for these tables in Supabase (see DEPLOY.md);
 *    if it isn't, this subscribes without error but simply never fires.
 * 2. Reconnect catch-up: the websocket to Supabase drops from time to time
 *    on its own — routers and ISPs commonly kill an idle connection after a
 *    minute or two of silence, nothing to do with this app. The client
 *    reconnects automatically, but a fresh subscription has no memory of
 *    what happened while it was down, so anything that changed in that gap
 *    would otherwise sit missed until something else triggers a refresh.
 *    Doing one refresh right as a connection comes back (not on the very
 *    first connect, only on a *re*-connect) closes that gap.
 * 3. Refocus fallback: phones aggressively suspend background tabs'
 *    websockets, so Realtime's socket can be dead by the time you switch
 *    back. Refreshing on refocus catches anything missed while the socket
 *    was down, regardless of whether Realtime is configured at all.
 * 4. Poll fallback: a court-side connection can be flaky enough that the
 *    websocket goes quietly dead — not a clean disconnect that would fire
 *    #2's reconnect, not backgrounded so #3 never refocuses — and just
 *    stops delivering events while everything still *looks* connected.
 *    That's exactly the "someone requests a set and the queue master is
 *    already looking at the screen, but it takes forever to show up" case.
 *    Backstop: while the tab is visible, refresh if nothing has refreshed
 *    for POLL_MS_REALTIME_DOWN (Realtime not subscribed) or
 *    POLL_MS_REALTIME_UP (subscribed) — see those constants for why.
 */
function useLiveRefresh(enabled: boolean) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let coalesceTimer: ReturnType<typeof setTimeout> | null = null;
    let hasSubscribedOnce = false;
    let realtimeUp = false;

    function refreshNow() {
      lastRefresh.current = Date.now();
      coalesceTimer = null;
      router.refresh();
    }

    function onDbChange() {
      if (coalesceTimer) return;
      coalesceTimer = setTimeout(refreshNow, COALESCE_MS);
    }

    const channel = supabase.channel("db-changes");
    for (const table of WATCHED_TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, onDbChange);
    }
    channel.subscribe((status) => {
      realtimeUp = status === "SUBSCRIBED";
      if (status === "SUBSCRIBED") {
        if (hasSubscribedOnce) {
          // A reconnect after a drop, not the initial connect — catch up on
          // whatever happened while the socket was down.
          refreshNow();
        }
        hasSubscribedOnce = true;
      }
    });

    function onRefocus() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastRefresh.current < MIN_MS_BETWEEN_REFOCUS_REFRESH) return;
      refreshNow();
    }
    document.addEventListener("visibilitychange", onRefocus);
    window.addEventListener("focus", onRefocus);

    // Count from mount, not from 0 — the page was just rendered fresh, so
    // the first poll shouldn't fire immediately.
    lastRefresh.current = Date.now();
    const pollTimer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const due = realtimeUp ? POLL_MS_REALTIME_UP : POLL_MS_REALTIME_DOWN;
      if (Date.now() - lastRefresh.current < due) return;
      refreshNow();
    }, POLL_TICK_MS);

    return () => {
      if (coalesceTimer) clearTimeout(coalesceTimer);
      clearInterval(pollTimer);
      document.removeEventListener("visibilitychange", onRefocus);
      window.removeEventListener("focus", onRefocus);
      supabase.removeChannel(channel);
    };
  }, [router, enabled]);
}

/** Pages that render full-screen with none of the usual chrome — each has
 * its own centered card layout, and a visitor there either isn't signed in
 * yet (`/login`) or never will be (`/join`, the public queue-viewing page),
 * so the nav links to pages they can't use would just be confusing. */
const CHROMELESS_PATHS = ["/login", "/join", "/welcome", "/signup", "/forgot-password", "/reset-password"];

/**
 * Wraps every page with the header + right-hand icon rail — except the
 * chromeless pages above.
 */
export function AppChrome({
  settings,
  isAdmin,
  isSignedIn,
  children,
}: {
  settings: AppSettings | null;
  isAdmin: boolean;
  isSignedIn: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // A signed-out visitor at "/" is looking at the marketing page (proxy.ts
  // rewrites it to /welcome, and the browser URL stays "/"), so that counts
  // as chromeless too — no dashboard header or nav around a landing page.
  const isChromeless = CHROMELESS_PATHS.includes(pathname) || (!isSignedIn && pathname === "/");

  // Registers the service worker that backs installability + the
  // dashboard's offline support (see public/sw.js and
  // src/lib/registerSW.ts) — app-wide, not just the dashboard, so the whole
  // thing can be added to a home screen even though only `/` actually
  // renders from cache when offline today.
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Realtime subscribes to tables an anonymous /join visitor has no read
  // access to (RLS) — pointless for them and just noise/errors in the
  // console, so only signed-in pages (i.e. never the chromeless ones) run
  // it. Hooks can't be called conditionally, so this guards *inside*
  // useLiveRefresh's effect instead of skipping the call itself.
  useLiveRefresh(!isChromeless);

  if (isChromeless) {
    return <ClubProvider club={settings}>{children}</ClubProvider>;
  }

  return (
    <ClubProvider club={settings}>
    <div className="flex min-h-screen flex-col pt-[env(safe-area-inset-top)]">
      <div className="sticky top-0 z-40">
        <OfflineBanner />
      </div>
      <div className="flex flex-1">
        {/* pb-20 clears the fixed bottom nav bar on mobile; not needed once
         * that bar disappears in favor of the desktop side rail at md. */}
        <div className="min-w-0 flex-1 pb-20 landscape:pb-0">{children}</div>
        <SidePanel settings={settings} isAdmin={isAdmin} />
      </div>
    </div>
    </ClubProvider>
  );
}
