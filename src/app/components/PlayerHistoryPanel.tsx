import type { Game } from "@/lib/types";

type GameForHistory = Pick<
  Game,
  "id" | "game_number" | "status" | "player1_id" | "player2_id" | "player3_id" | "player4_id"
>;

/**
 * A small floating card listing every game a player has actually played
 * this session (Ongoing or Done; a Queued game hasn't happened yet) and
 * exactly who else was on the court with them each time. Pure content, no
 * Modal/trigger of its own — GameFormFields decides when it's shown (one
 * per currently-picked player) and portals a stack of these below the New
 * Game form so picking someone immediately surfaces "have they already
 * played with X today" without an extra click.
 */
export function PlayerHistoryPanel({
  playerId,
  playerName,
  games,
  nameById,
}: {
  playerId: string;
  playerName: string;
  games: GameForHistory[];
  /** player_id -> display name, for the other names in each listed game. */
  nameById: Map<string, string>;
}) {
  const playedGames = games
    .filter(
      (g) =>
        g.status !== "Queued" &&
        [g.player1_id, g.player2_id, g.player3_id, g.player4_id].includes(playerId)
    )
    .sort((a, b) => a.game_number - b.game_number);

  return (
    <div className="w-full max-w-xs rounded-lg border border-black/10 bg-white p-3 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-brand">{playerName}&apos;s games today</p>
      {playedGames.length === 0 ? (
        <p className="text-xs text-black/40">Hasn&apos;t played a game yet today.</p>
      ) : (
        <ul className="max-h-32 space-y-1 overflow-y-auto pr-0.5">
          {playedGames.map((g) => {
            const withNames = [g.player1_id, g.player2_id, g.player3_id, g.player4_id]
              .filter((id): id is string => Boolean(id) && id !== playerId)
              .map((id) => nameById.get(id) ?? "—")
              .join(", ");
            return (
              <li
                key={g.id}
                className="flex items-center justify-between gap-2 rounded bg-black/[0.03] px-2 py-1 text-xs"
              >
                <span className="min-w-0 truncate">
                  <span className="text-black/40">Game {g.game_number}</span> — with{" "}
                  {withNames || "—"}
                </span>
                <span
                  className={`flex-none rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                    g.status === "Done" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {g.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
