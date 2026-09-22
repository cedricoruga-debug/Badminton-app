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
  maxHeight,
}: {
  playerId: string;
  playerName: string;
  games: GameForHistory[];
  /** player_id -> display name, for the other names in each listed game. */
  nameById: Map<string, string>;
  /** Caps the card to however much room is actually left below the modal
   * (GameFormFields measures it live) and makes the game list itself
   * scroll internally once it would otherwise run past that — a player
   * deep into a session's games no longer gets a card that quietly runs
   * off the bottom of the screen with nothing to scroll it into view. */
  maxHeight?: number;
}) {
  const playedGames = games
    .filter(
      (g) =>
        g.status !== "Queued" &&
        [g.player1_id, g.player2_id, g.player3_id, g.player4_id].includes(playerId)
    )
    .sort((a, b) => a.game_number - b.game_number);

  return (
    <div
      className="flex w-64 flex-none flex-col rounded-lg border border-black/10 bg-white p-2.5 shadow-lg"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <p className="mb-1.5 flex-none truncate text-xs font-semibold text-brand">{playerName}&apos;s games</p>
      {playedGames.length === 0 ? (
        <p className="text-xs text-black/40">Hasn&apos;t played yet today.</p>
      ) : (
        // Every game as one compact row (game #, "A / B / C / D" roster, a
        // status dot) rather than a two-line card per game. Scrolls within
        // its own space (min-h-0 + flex-1 + overflow-y-auto) once capped by
        // maxHeight above, instead of growing past the viewport.
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-0.5">
          {playedGames.map((g) => {
            // Same "A / B / C / D" format as the Games played list in a
            // player's own popup on the Players grid — all 4 slots, this
            // player included, slash-separated.
            const names = [g.player1_id, g.player2_id, g.player3_id, g.player4_id]
              .map((id) => (id ? nameById.get(id) ?? "—" : "—"))
              .join(" / ");
            return (
              <li
                key={g.id}
                className="flex items-center gap-1.5 rounded bg-black/[0.03] px-1.5 py-1 text-[11px] leading-none"
                title={`Game ${g.game_number} — ${names} (${g.status})`}
              >
                <span className="flex-none font-medium text-black/40">G{g.game_number}</span>
                <span className="min-w-0 flex-1 truncate text-black/80">{names}</span>
                <span
                  aria-label={g.status}
                  className={`h-1.5 w-1.5 flex-none rounded-full ${
                    g.status === "Done" ? "bg-green-500" : "bg-amber-500"
                  }`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
