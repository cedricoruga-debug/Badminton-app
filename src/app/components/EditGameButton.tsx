"use client";

import type { ReactNode } from "react";
import { updateGame } from "@/app/actions";
import { GameFormFields } from "@/app/components/GameFormFields";
import { Modal } from "@/app/components/Modal";
import type { GameWithPlayers } from "@/lib/queries";
import type { PlayerSessionWithPlayer } from "@/lib/types";

type SessionOption = { id: string; session_date: string };

/**
 * Wraps a game in an edit popup. `children` renders the trigger — the
 * caller controls the whole clickable surface (e.g. the full row, not just
 * a title) and is handed `open` to wire up.
 */
export function EditGameButton({
  game,
  sessions,
  players,
  children,
}: {
  game: GameWithPlayers;
  sessions: SessionOption[];
  players: PlayerSessionWithPlayer[];
  children: (open: () => void) => ReactNode;
}) {
  const defaultPlayerIds = [game.player1_id, game.player2_id, game.player3_id, game.player4_id].filter(
    (id): id is string => Boolean(id)
  );

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
          defaultStatus={game.status}
          defaultPlayerIds={defaultPlayerIds}
          submitLabel="Save changes"
          close={close}
        />
      )}
    </Modal>
  );
}
