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

  return (
    <>
      <main className="grid h-[calc(100vh-60px)] grid-cols-[1fr_1.8fr_0.8fr] gap-4 p-4">
        {/* Players — those registered for the latest session who haven't paid yet */}
        <section className="flex h-full min-h-0 min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex-none font-semibold">Players</h3>
          <ul className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
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

        {/* Games Queued — the biggest panel: what's left to play this session */}
        <section className="flex h-full min-h-0 min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 flex-none font-semibold">Games Queued</h3>
          <ul className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            {!session ? (
              <li className="py-8 text-center text-sm text-black/50">No ongoing session yet.</li>
            ) : queuedGames.length === 0 ? (
              <li className="py-10 text-center text-sm text-black/40">No games queued right now.</li>
            ) : (
              queuedGames.map((g) => (
                <GameRow key={g.id} game={g} sessions={sessions} players={sessionPlayers} />
              ))
            )}
          </ul>
        </section>

        {/* Slim panel: payment QR, shortcuts, stats */}
        <section className="h-full min-w-0 overflow-x-hidden overflow-y-auto rounded-xl bg-white p-4 shadow-sm">
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

          <div className="mt-5 grid grid-cols-2 gap-x-2 gap-y-3 text-center">
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
    </>
  );
}
