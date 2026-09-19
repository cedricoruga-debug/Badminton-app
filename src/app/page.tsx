import Link from "next/link";
import {
  getAllSessions,
  getAppSettings,
  getGames,
  getLatestSession,
  getPlayerSessions,
  getQueuedGames,
  getSessionGameCount,
  getUnpaidPlayerSessions,
} from "@/lib/queries";
import { PlayerSessionRow } from "@/app/components/PlayerSessionRow";
import { GameRow } from "@/app/components/GameRow";
import { CourtBox } from "@/app/components/CourtBox";
import { NewGameButton } from "@/app/components/NewGameButton";
import { NewPlayerButton } from "@/app/components/NewPlayerButton";
import { NewSessionButton } from "@/app/components/NewSessionButton";
import { SetupRequired } from "@/app/setup-required";
import { IconPlus, IconTrophy, IconUserPlus } from "@/app/components/icons";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <SetupRequired />;
  }

  const settings = await getAppSettings();
  const session = await getLatestSession();
  const sessions = await getAllSessions();
  const [unpaid, queuedGames, totalGameCount, sessionPlayers, allSessionGames] = session
    ? await Promise.all([
        getUnpaidPlayerSessions(session.id),
        getQueuedGames(session.id),
        getSessionGameCount(session.id),
        getPlayerSessions(session.id),
        getGames(session.id),
      ])
    : [[], [], 0, [], []];

  // Ongoing games get drawn as courts up top (see CourtBox); games that
  // haven't started yet stay in the plain list below. getQueuedGames
  // already orders both by game_number, so that order carries over into
  // each group.
  const ongoingGames = queuedGames.filter((g) => g.status === "Ongoing");
  const notStartedGames = queuedGames.filter((g) => g.status !== "Ongoing");

  // The 4 shortcut buttons — rendered twice below (once for the portrait
  // static top bar, once back in their original spot at the bottom of the
  // QR panel for landscape/desktop), CSS-toggled so only one is visible at
  // a time. Each is its own independent element/component instance, same
  // pattern as the nav rail vs. bottom nav bar in SidePanel.
  const shortcutButtons = (
    <>
      <NewSessionButton />

      <Link href="/games" className="flex flex-col items-center gap-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white transition-transform hover:scale-105">
          <IconTrophy className="h-4 w-4" />
        </span>
        <span className="text-[10px] leading-tight text-black/60">Games</span>
      </Link>

      {session ? (
        <NewGameButton
          sessionId={session.id}
          sessions={sessions}
          players={sessionPlayers.filter((ps) => !ps.done_for_session)}
          games={allSessionGames}
          nextGameNumber={totalGameCount + 1}
        />
      ) : (
        <div className="flex flex-col items-center gap-1 opacity-40">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
            <IconPlus className="h-5 w-5" />
          </span>
          <span className="text-[10px] leading-tight text-black/60">New Game</span>
        </div>
      )}

      {session ? (
        <NewPlayerButton sessions={sessions} defaultSessionId={session.id} />
      ) : (
        <div className="flex flex-col items-center gap-1 opacity-40">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white">
            <IconUserPlus className="h-4 w-4" />
          </span>
          <span className="text-[10px] leading-tight text-black/60">New player</span>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col landscape:h-[calc(100vh-60px)] landscape:overflow-hidden">
      {/* Static shortcuts bar — portrait/mobile only. Stays put at the top
       * (sticky under the header) so these are always one tap away without
       * scrolling all the way down to the QR panel. In landscape/desktop
       * the buttons go back to their original spot at the bottom of the QR
       * panel below, so this bar is hidden there instead. */}
      <div className="sticky top-[60px] z-30 flex-none px-4 pt-4 landscape:hidden">
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-center">{shortcutButtons}</div>
        </div>
      </div>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-4 pt-4 landscape:grid landscape:min-h-0 landscape:grid-cols-[0.5fr_1.8fr_0.8fr]">
        {/* Games Queued — what's left to play this session. Stays first in
         * the markup (so portrait/mobile shows it on top, per an earlier
         * request), but in landscape/desktop it's reordered back to the
         * middle/widest column via `order`, with Players back in the first
         * (narrower) column — the original desktop arrangement. Players'
         * column is 0.5fr (was 1fr, then 0.75fr) so it renders noticeably
         * narrower than the other two columns. */}
        <section className="flex min-h-0 min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm landscape:order-2 landscape:h-full">
          <h3 className="mb-3 flex-none font-semibold">Games Queued</h3>

          {ongoingGames.length > 0 && (
            <div className="mb-3 grid flex-none grid-cols-4 gap-2">
              {ongoingGames.map((g) => (
                <CourtBox
                  key={g.id}
                  game={g}
                  sessions={sessions}
                  players={sessionPlayers}
                  games={allSessionGames}
                />
              ))}
            </div>
          )}

          <ul className="max-h-96 overflow-x-hidden overflow-y-auto landscape:min-h-0 landscape:max-h-none landscape:flex-1">
            {!session ? (
              <li className="py-8 text-center text-sm text-black/50">No ongoing session yet.</li>
            ) : notStartedGames.length === 0 ? (
              <li className="py-10 text-center text-sm text-black/40">
                {ongoingGames.length > 0 ? "No games queued — everyone's playing." : "No games queued right now."}
              </li>
            ) : (
              notStartedGames.map((g) => (
                <GameRow
                  key={g.id}
                  game={g}
                  sessions={sessions}
                  players={sessionPlayers}
                  games={allSessionGames}
                />
              ))
            )}
          </ul>
        </section>

        {/* Players — those registered for the latest session who haven't paid yet */}
        <section className="flex min-h-0 min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm landscape:order-1 landscape:h-full">
          <h3 className="mb-3 flex-none font-semibold">Players</h3>
          <ul className="max-h-64 overflow-x-hidden overflow-y-auto landscape:min-h-0 landscape:max-h-none landscape:flex-1">
            {!session ? (
              <li className="py-8 text-center text-sm text-black/50">
                No sessions yet. Create one in Supabase (or wire up a &quot;New session&quot; button next) to get
                started.
              </li>
            ) : unpaid.length === 0 ? (
              <li className="py-4 text-sm text-black/50">Everyone&apos;s paid.</li>
            ) : (
              unpaid.map((ps) => <PlayerSessionRow key={ps.id} ps={ps} games={allSessionGames} />)
            )}
          </ul>
        </section>

        {/* Slim panel: payment QR + stats, at the bottom */}
        <section className="min-w-0 overflow-x-hidden rounded-xl bg-white p-4 shadow-sm landscape:order-3 landscape:h-full landscape:overflow-y-auto">
          {settings?.payment_qr_url ? (
            <div className="flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- external, user-uploaded QR image of unknown origin */}
              <img
                src={settings.payment_qr_url}
                alt="Payment QR code"
                width={400}
                height={400}
                className="h-auto w-full max-w-[360px] rounded"
              />
            </div>
          ) : (
            <div className="flex h-[140px] flex-col items-center justify-center gap-1 rounded border border-dashed border-black/15 px-3 text-center text-[11px] text-black/40">
              <p>No payment QR yet.</p>
              <p>Upload one from the Settings icon on the right.</p>
            </div>
          )}

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
          </dl>
        </section>
      </main>
    </div>
  );
}
