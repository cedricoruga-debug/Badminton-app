"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { IconShuttle } from "@/app/components/icons";
import { OfflineBanner } from "@/app/components/OfflineBanner";
import { SidePanel } from "@/app/components/SidePanel";
import { createClient } from "@/lib/supabase/client";
import type { AppSettings } from "@/lib/types";

const APP_TITLE = "Queuing App by Ced";

/** Every table a page on this site reads from — a change to any of them
 * could be showing on someone else's screen right now. */
const WATCHED_TABLES = ["players", "sessions", "games", "player_sessions", "app_settings"] as const;

/** If several rows change at once (e.g. saving a game touches both `games`
 * and `player_sessions`), coalesce them into one refresh instead of one per
 * row. */
const COALESCE_MS = 400;

/** Belt-and-suspenders minimum gap between refocus-triggered refreshes —
 * only matters if Realtime itself is unreachable (see below). */
const MIN_MS_BETWEEN_REFOCUS_REFRESH = 5000;

/**
 * Keeps the current page's data in sync with everyone else's — the whole
 * reason this exists is "I deleted something on my phone and my laptop
 * didn't notice." Three mechanisms, layered:
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
 */
function useLiveRefresh(enabled: boolean) {
  const router = useRouter();
  const lastRefresh = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    let coalesceTimer: ReturnType<typeof setTimeout> | null = null;
    let hasSubscribedOnce = false;

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

    return () => {
      if (coalesceTimer) clearTimeout(coalesceTimer);
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
const CHROMELESS_PATHS = ["/login", "/join"];

/**
 * Wraps every page with the header + right-hand icon rail — except the
 * chromeless pages above.
 */
export function AppChrome({
  settings,
  isAdmin,
  children,
}: {
  settings: AppSettings | null;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isChromeless = CHROMELESS_PATHS.includes(pathname);

  // Realtime subscribes to tables an anonymous /join visitor has no read
  // access to (RLS) — pointless for them and just noise/errors in the
  // console, so only signed-in pages (i.e. never the chromeless ones) run
  // it. Hooks can't be called conditionally, so this guards *inside*
  // useLiveRefresh's effect instead of skipping the call itself.
  useLiveRefresh(!isChromeless);

  if (isChromeless) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex items-center gap-3 bg-gradient-to-r from-brand to-accent px-4 py-3 text-white shadow-[0_2px_14px_rgba(236,72,153,0.3)]">
        <span className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full bg-white/15">
          {settings?.app_icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded image of unknown origin
            <img src={settings.app_icon_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <IconShuttle className="h-5 w-5" />
          )}
        </span>
        <h1 className="text-lg font-semibold">{APP_TITLE}</h1>
      </header>
      <div className="sticky top-[60px] z-40">
        <OfflineBanner />
      </div>
      <div className="flex flex-1">
        {/* pb-20 clears the fixed bottom nav bar on mobile; not needed once
         * that bar disappears in favor of the desktop side rail at md. */}
        <div className="min-w-0 flex-1 pb-20 landscape:pb-0">{children}</div>
        <SidePanel settings={settings} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
