"use client";

import { createGame } from "@/app/actions";
import { GameFormFields } from "@/app/components/GameFormFields";
import { Modal } from "@/app/components/Modal";
import { IconPlus } from "@/app/components/icons";
import type { Game, PlayerSessionWithPlayer } from "@/lib/types";

type SessionOption = { id: string; session_date: string };
type GameForStatus = Pick<Game, "id" | "game_number" | "status" | "player1_id" | "player2_id" | "player3_id" | "player4_id">;

export function NewGameButton({
  sessionId,
  sessions,
  players,
  games = [],
  nextGameNumber,
  redirectTo,
  variant = "grid",
}: {
  sessionId: string;
  sessions: SessionOption[];
  players: PlayerSessionWithPlayer[];
  /** Every other game in this session — colors the player picker by who's
   * free, queued, or currently playing. See GameFormFields. */
  games?: GameForStatus[];
  nextGameNumber?: number;
  /** Where to land after saving — defaults to "/" (the dashboard). */
  redirectTo?: string;
  /** "grid" (default): Modal's icon-over-label button, for the dashboard's
   * shortcuts grid. "icon": a compact circular button for a panel header
   * (e.g. the Games page). Kept as a plain string rather than a passed-in
   * trigger element so this can be rendered from a Server Component page. */
  variant?: "grid" | "icon";
}) {
  const title = nextGameNumber !== undefined ? `New Game #${nextGameNumber}` : "New Game";

  return (
    <Modal
      label="New Game"
      icon={<IconPlus className="h-5 w-5" />}
      title={title}
      size="sm"
      trigger={
        variant === "icon"
          ? (open) => (
              <button
                type="button"
                onClick={open}
                title="New game"
                aria-label="New game"
                className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-light text-brand transition-colors hover:bg-brand hover:text-white"
              >
                <IconPlus className="h-3.5 w-3.5" />
              </button>
            )
          : undefined
      }
    >
      {(close) => (
        <GameFormFields
          action={createGame}
          sessions={sessions}
          defaultSessionId={sessionId}
          players={players}
          games={games}
          close={close}
          redirectTo={redirectTo}
        />
      )}
    </Modal>
  );
}
