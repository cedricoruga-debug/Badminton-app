"use client";

import type { ReactNode } from "react";
import { updateGame } from "@/app/actions";
import { GameFormFields } from "@/app/components/GameFormFields";
import { Modal } from "@/app/components/Modal";
import type { GameWithPlayers } from "@/lib/queries";
import type { Game, PlayerSessionWithPlayer } from "@/lib/types";

type SessionOption = { id: string; session_date: string };
type GameForStatus = Pick<Game, "id" | "game_number" | "status" | "player1_id" | "player2_id" | "player3_id" | "player4_id">;

/**
 * Wraps a game in an edit popup. `children` renders the trigger — the
 * caller controls the whole clickable surface (e.g. the full row, not just
 * a title) and is handed `open` to wire up.
 */
export function EditGameButton({
  game,
  sessions,
  players,
  games = [],
  children,
}: {
  game: GameWithPlayers;
  sessions: SessionOption[];
  players: PlayerSessionWithPlayer[];
  /** Every other game in this session — colors the player picker by who's
   * free, queued, or currently playing. See GameFormFields. */
  games?: GameForStatus[];
  children: (open: () => void) => ReactNode;
}) {
  // Kept as four raw slots (nulls included), not compacted — a game that
  // already has a gap (player2 missing, say) should reopen with that same
  // gap in place rather than sliding player3 up into player2's spot, which
  // would silently swap who's partnered with whom. See GameFormFields'
  // `selected` state.
  const defaultPlayerIds: (string | null)[] = [
    game.player1_id,
    game.player2_id,
    game.player3_id,
    game.player4_id,
  ];

  return (
    <Modal label="Edit Game" icon={null} title={`Edit Game #${game.game_number}`} trigger={children}>
      {(close) => (
        <GameFormFields
          action={updateGame}
          gameId={game.id}
          sessionId={game.session_id}
          sessions={sessions}
          defaultSessionId={game.session_id}
          players={players}
          games={games}
          defaultStatus={game.status}
          defaultPlayerIds={defaultPlayerIds}
          defaultWinnerTeam={game.winner_team}
          defaultScore1={game.score1}
          defaultScore2={game.score2}
          submitLabel="Save changes"
          close={close}
        />
      )}
    </Modal>
  );
}
