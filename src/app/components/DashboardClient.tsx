"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { CourtBox } from "@/app/components/CourtBox";
import { GameRow } from "@/app/components/GameRow";
import { IconPlus, IconRacket, IconTrophy, IconUserPlus, IconUsers } from "@/app/components/icons";
import { JoinQrSection } from "@/app/components/JoinQrSection";
import { LiveDot } from "@/app/components/LiveDot";
import { NewGameButton } from "@/app/components/NewGameButton";
import { NewPlayerButton } from "@/app/components/NewPlayerButton";
import { NewSessionButton } from "@/app/components/NewSessionButton";
import { PaymentQrSection } from "@/app/components/PaymentQrSection";
import { PlayerSessionRow } from "@/app/components/PlayerSessionRow";
import { loadActiveDashboardData, seedFromServer, type DashboardData } from "@/lib/localCache";

/** How old the embedded server data can be before this load gets treated as
 * a page the service worker replayed from its own cache (see
 * public/sw.js's networkFirstNavigation) rather than a genuinely fresh
 * response — and IndexedDB gets checked instead, since it may have moved on
 * further than whatever got frozen into that cached HTML (an offline
 * mutation made after the snapshot was taken writes there directly; see
 * offlineQueue.ts). A live `force-dynamic` response hydrates within a
 * second or two of the request even on a slow connection; 20s is generous
 * headroom against false-flagging a normal load as stale.
 */
const STALE_SEED_MS = 20_000;

export type DashboardSeed = DashboardData & { fetchedAt: string };

/**
 * The dashboard's actual content — split out of page.tsx (a Server
 * Component) so it can render from two different sources depending on
 * whether the request that produced this page actually reached the server:
 *
 * - Online: `seed` is fresh (page.tsx just fetched it), gets written
 *   straight into the IndexedDB cache to keep it warm, and is rendered
 *   immediately — same speed as before this split, no added spinner.
 * - Offline: the service worker answered the navigation from its own
 *   cache, so `seed` is really a stale snapshot from whenever that
 *   response was captured. This component notices (see STALE_SEED_MS
 *   above) and swaps to whatever's in IndexedDB instead, which may be
 *   more current, plus shows a small "offline" notice.
 *
 * All the derived numbers that used to live in page.tsx (MVP, court
 * layout, unpaid players, queued-vs-ongoing split) move here too, so both
 * sources compute them identically — the two paths should only ever differ
 * in *how fresh* the underlying rows are, never in how a number gets
 * derived from them.
 */
export function DashboardClient({ seed }: { seed: DashboardSeed }) {
  // Whether this render's `seed` looks like it came from a live response
  // rather than one the service worker replayed from its own cache. Derived
  // straight from the prop (no state) so a later render with a genuinely
  // fresh `seed` always wins immediately, with nothing to "clear" first.
  const looksStale = Date.now() - new Date(seed.fetchedAt).getTime() >= STALE_SEED_MS;

  // Only set when `looksStale` — the IndexedDB read is async, so there's a
  // brief window (still showing the stale `seed`) before this resolves.
  // Cleared implicitly: once a fresh `seed` arrives, `looksStale` is false
  // and this value is simply never consulted below.
  const [cacheOverride, setCacheOverride] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!looksStale) {
      // A genuinely fresh load — keep the offline cache warm for next time.
      seedFromServer(seed).catch(() => {});
      return;
    }
    // Looks replayed rather than live — prefer IndexedDB, which may be
    // ahead of this frozen snapshot (an offline mutation made after it was
    // captured writes there directly; see offlineQueue.ts).
    let cancelled = false;
    loadActiveDashboardData().then((cached) => {
      if (!cancelled && cached) setCacheOverride(cached);
    });
    return () => {
      cancelled = true;
    };
  }, [seed, looksStale]);

  const data = looksStale ? (cacheOverride ?? seed) : seed;
  const isOffline = looksStale;
  const { settings, session, sessions, sessionPlayers, games } = data;

  // Ongoing games get drawn as courts up top (see CourtBox); games that
  // haven't started yet stay in the plain list below. `games` is ordered
  // by game_number already (both the server fetch and the IndexedDB read
  // preserve that), so that order carries over into each group.
  const queuedGames = games.filter((g) => g.status !== "Done");
  const ongoingGames = queuedGames.filter((g) => g.status === "Ongoing");
  const notStartedGames = queuedGames.filter((g) => g.status !== "Ongoing");
  const totalGameCount = games.length;
  const unpaid = sessionPlayers.filter((ps) => ps.payment_method === null);

  // How many courts fit in one row before the strip below starts scrolling
  // sideways instead of shrinking further or wrapping to a second row. 1-2
  // courts keep the same size they'd have side by side (no visible change);
  // 3 shrink together so all three still fit in one row; 4+ hold that same
  // "3 courts wide" size and just scroll — never smaller, never a second
  // row eating vertical space. Capped at 3 rather than 4 so each court
  // stays a comfortably large tap target on a phone — 4-across made the
  // winner-shortcut halves too cramped to reliably tap.
  const courtColumns = Math.min(3, Math.max(2, ongoingGames.length));
  const courtWidth = `calc((100% - ${(courtColumns - 1) * 0.75}rem) / ${courtColumns})`;

  // A few extra numbers for the Details panel below the QR code — all
  // derived from sessionPlayers/games, already in hand, no extra fetch.
  const totalPlayers = sessionPlayers.length;
  const paidPlayersCount = sessionPlayers.filter((ps) => ps.payment_method !== null).length;

  // MVP = most wins, not most games played — winner_team is optional per
  // game (see GameFormFields), so a session with nothing recorded yet just
  // shows no MVP rather than falling back to games-played.
  const winCounts = new Map<string, number>();
  for (const g of games) {
    if (!g.winner_team) continue;
    const winners = g.winner_team === "team1" ? [g.player1_id, g.player2_id] : [g.player3_id, g.player4_id];
    for (const playerId of winners) {
      if (playerId) winCounts.set(playerId, (winCounts.get(playerId) ?? 0) + 1);
    }
  }
  const mostWins = Math.max(0, ...Array.from(winCounts.values()));
  const mvpNames =
    mostWins > 0
      ? sessionPlayers
          .filter((ps) => (winCounts.get(ps.player_id) ?? 0) === mostWins)
          .map((ps) => ps.player.name)
          .join(" & ")
      : null;

  // The 4 shortcut buttons — rendered twice below (once for the portrait
  // static top bar, once back in their original spot at the bottom of the
  // QR panel for landscape/desktop), CSS-toggled so only one is visible at
  // a time. Each is its own independent element/component instance, same
  // pattern as the nav rail vs. bottom nav bar in SidePanel.
  const shortcutButtons = (
    <>
      <NewSessionButton />

      <Link href="/games" className="flex flex-col items-center gap-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-full btn-brand text-white transition-transform hover:scale-105">
          <IconTrophy className="h-4 w-4" />
        </span>
        <span className="text-[10px] leading-tight text-black/60">Games</span>
      </Link>

      {session ? (
        <NewGameButton
          sessionId={session.id}
          sessions={sessions}
          players={sessionPlayers.filter((ps) => !ps.done_for_session)}
          games={games}
          nextGameNumber={totalGameCount + 1}
        />
      ) : (
        <div className="flex flex-col items-center gap-1 opacity-40">
          <span className="flex h-9 w-9 items-center justify-center rounded-full btn-brand text-white">
            <IconPlus className="h-5 w-5" />
          </span>
          <span className="text-[10px] leading-tight text-black/60">New Game</span>
        </div>
      )}

      {session ? (
        <NewPlayerButton sessions={sessions} defaultSessionId={session.id} />
      ) : (
        <div className="flex flex-col items-center gap-1 opacity-40">
          <span className="flex h-9 w-9 items-center justify-center rounded-full btn-brand text-white">
            <IconUserPlus className="h-4 w-4" />
          </span>
          <span className="text-[10px] leading-tight text-black/60">New player</span>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col landscape:h-[calc(100vh-60px)] landscape:overflow-hidden">
      {isOffline && (
        <div className="flex-none px-4 pt-4">
          <div className="rounded-lg bg-black/70 px-3 py-2 text-center text-xs font-medium text-white">
            Offline — showing the last synced data.
          </div>
        </div>
      )}

      {/* Static shortcuts bar — portrait/mobile only. Stays put at the top
       * (sticky under the header) so these are always one tap away without
       * scrolling all the way down to the QR panel. In landscape/desktop
       * the buttons go back to their original spot at the bottom of the QR
       * panel below, so this bar is hidden there instead. */}
      <div className="sticky top-[60px] z-30 flex-none px-4 pt-4 landscape:hidden">
        <div className="rounded-xl bg-white p-3 shadow-soft">
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-center">{shortcutButtons}</div>
        </div>
      </div>

      {/* On court — every Ongoing game, drawn as a court card, in its own
       * full-width band above the three-column layout rather than eating
       * space inside "Games Queued" below. Always a single row: 1-2 courts
       * just sit at their natural size, 3 shrink together to still fit that
       * one row, and a 4th+ court doesn't shrink the rest any further or
       * wrap to a second row — the strip scrolls sideways instead, so this
       * band's height never grows with how many courts are live, and each
       * court stays big enough to tap accurately (see courtColumns above).
       * Below 420px it falls back to stacking full-width (one court per
       * line) — shrinking 2-3 across on a narrow phone would leave them too
       * cramped to read or tap. */}
      {ongoingGames.length > 0 && (
        <div className="flex-none px-4 pt-4">
          <section className="rounded-xl bg-white p-4 shadow-soft">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <LiveDot dot="bg-rose-500" ping="bg-rose-400/70" />
              On court
            </h3>
            <div
              className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:overflow-x-auto min-[420px]:pb-1"
              style={{ "--court-w": courtWidth } as CSSProperties}
            >
              {ongoingGames.map((g) => (
                <div key={g.id} className="min-[420px]:w-[var(--court-w)] min-[420px]:flex-none">
                  <CourtBox game={g} sessions={sessions} players={sessionPlayers} games={games} />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      <main className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-4 landscape:grid landscape:min-h-0 landscape:grid-cols-[0.5fr_1.8fr_0.8fr]">
        {/* Games Queued — what's left to play this session. Stays first in
         * the markup (so portrait/mobile shows it on top, per an earlier
         * request), but in landscape/desktop it's reordered back to the
         * middle/widest column via `order`, with Players back in the first
         * (narrower) column — the original desktop arrangement. Players'
         * column is 0.5fr (was 1fr, then 0.75fr) so it renders noticeably
         * narrower than the other two columns. */}
        <section className="flex min-h-0 min-w-0 flex-col rounded-xl bg-white p-4 shadow-soft landscape:order-2 landscape:h-full">
          <h3 className="mb-3 flex flex-none items-center gap-1.5 font-semibold">
            <IconRacket className="h-4 w-4 text-brand" />
            Games Queued
          </h3>

          <ul className="max-h-96 overflow-x-hidden overflow-y-auto landscape:min-h-0 landscape:max-h-none landscape:flex-1">
            {!session ? (
              <li className="py-8 text-center text-sm text-black/50">No ongoing session yet.</li>
            ) : notStartedGames.length === 0 ? (
              <li className="py-10 text-center text-sm text-black/40">
                {ongoingGames.length > 0 ? "No games queued — everyone's playing." : "No games queued right now."}
              </li>
            ) : (
              notStartedGames.map((g) => (
                <GameRow key={g.id} game={g} sessions={sessions} players={sessionPlayers} games={games} />
              ))
            )}
          </ul>
        </section>

        {/* Players — those registered for the latest session who haven't paid yet */}
        <section className="flex min-h-0 min-w-0 flex-col rounded-xl bg-white p-4 shadow-soft landscape:order-1 landscape:h-full">
          <h3 className="mb-3 flex flex-none items-center gap-1.5 font-semibold">
            <IconUsers className="h-4 w-4 text-brand" />
            Players
          </h3>
          <ul className="max-h-64 overflow-x-hidden overflow-y-auto landscape:min-h-0 landscape:max-h-none landscape:flex-1">
            {!session ? (
              <li className="py-8 text-center text-sm text-black/50">
                No sessions yet. Create one in Supabase (or wire up a &quot;New session&quot; button next) to get
                started.
              </li>
            ) : unpaid.length === 0 ? (
              <li className="py-4 text-sm text-black/50">Everyone&apos;s paid.</li>
            ) : (
              unpaid.map((ps) => <PlayerSessionRow key={ps.id} ps={ps} games={games} />)
            )}
          </ul>
        </section>

        {/* Slim panel: payment QR + stats, at the bottom */}
        <section className="min-w-0 overflow-x-hidden rounded-xl bg-white p-4 shadow-soft landscape:order-3 landscape:h-full landscape:overflow-y-auto">
          <PaymentQrSection qrUrl={settings?.payment_qr_url ?? null} />

          <div className="mt-5 hidden grid-cols-2 gap-x-2 gap-y-3 text-center landscape:grid">
            {shortcutButtons}
          </div>

          <dl className="mt-5 space-y-2 border-t border-black/10 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-black/50">Recent gameday</dt>
              <dd className="font-medium">
                {session ? new Date(session.session_date).toLocaleDateString("en-US") : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black/50">Total games</dt>
              <dd className="font-medium">{totalGameCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black/50">Total players</dt>
              <dd className="font-medium">{totalPlayers}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black/50">Paid</dt>
              <dd
                className={`font-medium ${
                  totalPlayers > 0 && paidPlayersCount === totalPlayers ? "text-green-700" : ""
                }`}
              >
                {totalPlayers > 0 ? `${paidPlayersCount}/${totalPlayers}` : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-black/50">Today&apos;s MVP</dt>
              <dd className="flex items-center gap-1 font-medium">
                {mvpNames ? (
                  <>
                    <IconTrophy className="h-3.5 w-3.5 flex-none text-amber-500" />
                    <span className="truncate">{mvpNames}</span>
                  </>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>

          {/* Join QR — pinned to the very bottom of the panel (so, in
           * portrait, the very bottom of the whole page), styled to match
           * the payment QR up top: same centered/rounded treatment, same
           * dashed empty-state box when there's nothing to show yet.
           * Collapsed behind a toggle by default rather than always-on
           * like the payment QR — unlike that one, this QR is something
           * you'd only pull up in the moment a new player's arriving. */}
          {session && (
            <div className="mt-5 border-t border-black/10 pt-4">
              <JoinQrSection sessionId={session.id} joinCode={session.join_code} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
