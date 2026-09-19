"use client";

import { Modal } from "@/app/components/Modal";
import type { Game } from "@/lib/types";

type GameForHistory = Pick<
  Game,
  "id" | "game_number" | "status" | "player1_id" | "player2_id" | "player3_id" | "player4_id"
>;

/**
 * A small, subtle trigger — just a name and a game count — that opens a
 * per-player popup listing every game they've actually played this session
 * (Ongoing or Done; a Queued game hasn't happened yet so it doesn't count)
 * and who else was on the court with them each time. Meant to sit at the
 * bottom of the New Game / Edit Game player picker so you can check "have
 * these two already played together today" before locking in a matchup,
 * without leaving the form — it's a Modal nested inside that form's own
 * Modal, and opens/closes independently of it.
 */
export function PlayerHistoryButton({
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
    <Modal
      label={playerName}
      icon={null}
      title={`${playerName}'s games today`}
      size="sm"
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="rounded-full border border-black/10 px-2 py-0.5 text-[11px] text-black/40 transition-colors hover:border-brand/40 hover:text-brand"
        >
          {playerName}
          <span className="ml-1 opacity-70">({playedGames.length})</span>
        </button>
      )}
    >
      {() => (
        <div className="space-y-1.5">
          {playedGames.length === 0 ? (
            <p className="text-sm text-black/40">Hasn&apos;t played a game yet today.</p>
          ) : (
            playedGames.map((g) => {
              const withNames = [g.player1_id, g.player2_id, g.player3_id, g.player4_id]
                .filter((id): id is string => Boolean(id) && id !== playerId)
                .map((id) => nameById.get(id) ?? "—")
                .join(", ");
              return (
                <div
                  key={g.id}
                  className="flex items-center justify-between gap-2 rounded bg-black/[0.03] px-2 py-1.5 text-sm"
                >
                  <span className="min-w-0 truncate">
                    <span className="text-black/40">Game {g.game_number}</span> — with{" "}
                    {withNames || "—"}
                  </span>
                  <span
                    className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      g.status === "Done" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {g.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </Modal>
  );
}
