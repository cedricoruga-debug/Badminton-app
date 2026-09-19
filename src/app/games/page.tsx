import Link from "next/link";
import { GameRow } from "@/app/components/GameRow";
import { NewGameButton } from "@/app/components/NewGameButton";
import { getAllGames, getAllSessions, getPlayerSessions } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Games view: a left panel of session dates (grouping games by date) and a
 * main panel showing that date's games — a master/detail layout instead of
 * one long flat list. Which date is selected lives in the URL (?session=id)
 * so it's just links, no client state.
 */
export default async function GamesPage(props: PageProps<"/games">) {
  const searchParams = await props.searchParams;
  const requestedSession = typeof searchParams.session === "string" ? searchParams.session : undefined;

  const [sessions, allGames] = await Promise.all([getAllSessions(), getAllGames()]);

  const gameCounts = new Map<string, number>();
  for (const g of allGames) {
    gameCounts.set(g.session_id, (gameCounts.get(g.session_id) ?? 0) + 1);
  }

  const selectedSessionId =
    requestedSession && sessions.some((s) => s.id === requestedSession) ? requestedSession : sessions[0]?.id;

  const selectedGames = selectedSessionId
    ? allGames
        .filter((g) => g.session_id === selectedSessionId)
        .sort((a, b) => a.game_number - b.game_number)
    : [];
  const selectedPlayers = selectedSessionId ? await getPlayerSessions(selectedSessionId) : [];

  const sessionOptions = sessions.map((s) => ({ id: s.id, session_date: s.session_date }));

  return (
    <div className="flex flex-col p-4 landscape:h-[calc(100vh-60px)] landscape:overflow-hidden">
      <Breadcrumb current="Games" />

      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-black/40">No sessions yet.</p>
      ) : (
        <div className="flex flex-col gap-4 landscape:min-h-0 landscape:flex-1 landscape:flex-row landscape:items-stretch">
          {/* Dates panel — header fixed, only the date list scrolls */}
          <section className="flex w-full flex-none flex-col overflow-hidden rounded-xl bg-white p-3 shadow-sm landscape:w-56">
            <h3 className="mb-2 flex-none px-1 text-xs font-semibold uppercase tracking-wide text-black/40">
              Dates
            </h3>
            <ul className="max-h-48 space-y-1 overflow-x-hidden overflow-y-auto landscape:min-h-0 landscape:max-h-none landscape:flex-1">
              {sessions.map((s) => {
                const active = s.id === selectedSessionId;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/games?session=${s.id}`}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        active ? "bg-brand font-medium text-white" : "text-black/70 hover:bg-black/5"
                      }`}
                    >
                      <span>{new Date(s.session_date).toLocaleDateString("en-US")}</span>
                      <span className={active ? "text-white/70" : "text-black/30"}>
                        {gameCounts.get(s.id) ?? 0}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Games for the selected date — header fixed, only the games list scrolls */}
          <section className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-white p-4 shadow-sm landscape:flex-1">
            <div className="mb-2 flex flex-none items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-black/40">Games</h3>
              {selectedSessionId && (
                <NewGameButton
                  sessionId={selectedSessionId}
                  sessions={sessionOptions}
                  players={selectedPlayers.filter((ps) => !ps.done_for_session)}
                  games={selectedGames}
                  nextGameNumber={selectedGames.length + 1}
                  redirectTo={`/games?session=${selectedSessionId}`}
                  variant="icon"
                />
              )}
            </div>
            <div className="overflow-x-hidden landscape:min-h-0 landscape:flex-1 landscape:overflow-y-auto">
              {selectedGames.length === 0 ? (
                <p className="py-10 text-center text-sm text-black/40">No games logged for this date yet.</p>
              ) : (
                <ul>
                  {selectedGames.map((g) => (
                    <GameRow
                      key={g.id}
                      game={g}
                      sessions={sessionOptions}
                      players={selectedPlayers}
                      games={selectedGames}
                    />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Breadcrumb({ current }: { current: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 text-sm text-black/50">
      <Link href="/" className="hover:text-brand">
        Home
      </Link>
      <span>›</span>
      <span className="text-black/80">{current}</span>
    </div>
  );
}
