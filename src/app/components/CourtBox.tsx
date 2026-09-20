"use client";

import { useTransition } from "react";
import { advanceGameStatus } from "@/app/actions";
import { EditGameButton } from "@/app/components/EditGameButton";
import type { GameWithPlayers } from "@/lib/queries";
import type { Game, PlayerSessionWithPlayer } from "@/lib/types";

type SessionOption = { id: string; session_date: string };
type GameForStatus = Pick<Game, "id" | "game_number" | "status" | "player1_id" | "player2_id" | "player3_id" | "player4_id">;

/**
 * An Ongoing game, drawn as a little badminton court instead of a plain
 * list row — a court "card" that's actually happening right now deserves to
 * look like it. The net (the thick white line) splits it into the two
 * teams: player1 + player2 on top, player3 + player4 on the bottom, each
 * name sitting in its own corner of the court, the same 2-vs-2 layout the
 * "New Game"/edit form uses to pick players.
 *
 * Click opens the same edit popup a queued game's row does (EditGameButton
 * wraps whatever's handed to it as `children`, same pattern as GameRow) —
 * this isn't a separate flow, just a different look for the same game. The
 * "Done" button at the bottom is the same advanceGameStatus used by
 * GameRow's "Move forward" — for an Ongoing game that always means Done.
 */
export function CourtBox({
  game,
  sessions,
  players,
  games = [],
}: {
  game: GameWithPlayers;
  sessions: SessionOption[];
  players: PlayerSessionWithPlayer[];
  /** Every other game in this session — colors the edit popup's player
   * picker by who's free, queued, or currently playing. See
   * GameFormFields. */
  games?: GameForStatus[];
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <EditGameButton game={game} sessions={sessions} players={players} games={games}>
      {(open) => (
        <div
          role="button"
          tabIndex={0}
          onClick={open}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              open();
            }
          }}
          className="flex cursor-pointer flex-col overflow-hidden rounded-xl shadow-soft ring-1 ring-black/10 transition-transform hover:-translate-y-0.5"
        >
          <p className="flex-none truncate bg-black/80 px-1.5 py-1.5 text-center text-xs font-semibold text-white">
            Game {game.game_number}
          </p>

          {/* The court: two halves split by the net, 2 players a side. Taller
           * than it is wide, like a real court, with room for the name to
           * wrap to a second line rather than truncate. */}
          <div className="flex min-h-[220px] flex-1 flex-col bg-emerald-600">
            <div className="grid flex-1 grid-cols-2 divide-x divide-white/40 border-b-[3px] border-white/90">
              <PlayerCell name={game.player1?.name} />
              <PlayerCell name={game.player2?.name} />
            </div>
            <div className="grid flex-1 grid-cols-2 divide-x divide-white/40">
              <PlayerCell name={game.player3?.name} />
              <PlayerCell name={game.player4?.name} />
            </div>
          </div>

          <button
            type="button"
            disabled={isPending}
            title="Mark this game done"
            onClick={(e) => {
              e.stopPropagation();
              startTransition(() => advanceGameStatus(game.id, game.status));
            }}
            className="flex-none bg-amber-400 px-1.5 py-1.5 text-center text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            Ongoing — mark done
          </button>
        </div>
      )}
    </EditGameButton>
  );
}

function PlayerCell({ name }: { name?: string | null }) {
  return (
    <div className="flex min-w-0 items-center justify-center px-1.5 py-2 text-center">
      <span className="break-words text-base font-bold leading-tight text-white">{name ?? "—"}</span>
    </div>
  );
}
