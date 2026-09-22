"use client";

import { useState, useTransition } from "react";
import { EditGameButton } from "@/app/components/EditGameButton";
import { IconEdit } from "@/app/components/icons";
import { queueableAdvanceGameStatus, queueableFinishGameWithWinner, useIsOnline } from "@/lib/offlineQueue";
import type { GameWithPlayers } from "@/lib/queries";
import type { Game, PlayerSessionWithPlayer } from "@/lib/types";

type SessionOption = { id: string; session_date: string };
type GameForStatus = Pick<Game, "id" | "game_number" | "status" | "player1_id" | "player2_id" | "player3_id" | "player4_id">;

/**
 * An Ongoing game, drawn as a little badminton court instead of a plain
 * list row — a court "card" that's actually happening right now deserves to
 * look like it. The net (the thick white line) splits it into the two
 * teams left vs. right, broadcast-angle style: player1 + player2 on the
 * left, player3 + player4 on the right, each name sitting in its own corner
 * of the court — same 2-vs-2 layout the New Game/edit form uses to pick
 * players.
 *
 * Each half is its own tap target — a shortcut for the single most common
 * thing that happens to an Ongoing game: it ends, and one side won. Tap a
 * side to pick it (tapping the other side switches; tapping the same side
 * again un-picks it), then Confirm to mark the game Done with that team as
 * winner, no trip through the Edit Game popup needed. That popup — opened
 * from the header bar's pencil — is still there for anything this shortcut
 * doesn't cover: swapping a player, correcting a winner, adding a score, or
 * marking a game done with no winner recorded at all ("No winner" below).
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
  const [armedTeam, setArmedTeam] = useState<"team1" | "team2" | null>(null);
  const [isFinishing, startFinishTransition] = useTransition();
  const [isMarkingDone, startMarkDoneTransition] = useTransition();
  const isOnline = useIsOnline();
  const isBusy = isFinishing || isMarkingDone;

  const team1Names = [game.player1?.name, game.player2?.name];
  const team2Names = [game.player3?.name, game.player4?.name];
  const armedNames = armedTeam === "team1" ? team1Names : armedTeam === "team2" ? team2Names : null;

  function confirmWinner() {
    if (!armedTeam) return;
    const team = armedTeam;
    startFinishTransition(async () => {
      await queueableFinishGameWithWinner(isOnline, game.id, team);
      setArmedTeam(null);
    });
  }

  return (
    <EditGameButton game={game} sessions={sessions} players={players} games={games}>
      {(open) => (
        <div className="flex flex-col overflow-hidden rounded-xl shadow-soft ring-1 ring-black/10">
          <button
            type="button"
            onClick={open}
            title="Edit this game"
            className="flex flex-none items-center justify-center gap-1.5 bg-black/80 px-1.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-black/70"
          >
            Game {game.game_number}
            <IconEdit className="h-3 w-3 opacity-50" />
          </button>

          {/* The court: two halves split by the net, 2 players a side, each
           * half its own tap target for the winner shortcut below. Wider
           * than it is tall — the net runs down the middle instead of
           * across it — with room for a name to wrap to a second line
           * rather than truncate. */}
          <div className="flex min-h-[140px] flex-1 flex-row bg-emerald-600">
            <TeamHalf
              names={team1Names}
              armed={armedTeam === "team1"}
              disabled={isBusy}
              onTap={() => setArmedTeam((prev) => (prev === "team1" ? null : "team1"))}
              netSide
            />
            <TeamHalf
              names={team2Names}
              armed={armedTeam === "team2"}
              disabled={isBusy}
              onTap={() => setArmedTeam((prev) => (prev === "team2" ? null : "team2"))}
            />
          </div>

          {armedTeam && armedNames ? (
            <div className="flex flex-none items-center justify-between gap-1.5 bg-amber-400 px-1.5 py-1.5">
              <span className="min-w-0 truncate text-[11px] font-semibold text-amber-900">
                {armedNames.filter(Boolean).join(" & ")} won?
              </span>
              <span className="flex flex-none items-center gap-1">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={confirmWinner}
                  className="rounded bg-amber-900 px-2 py-1 text-[10px] font-bold text-white transition-colors hover:bg-amber-950 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setArmedTeam(null)}
                  className="rounded px-1.5 py-1 text-[10px] font-medium text-amber-900/70 transition-colors hover:bg-amber-300/60"
                >
                  Cancel
                </button>
              </span>
            </div>
          ) : (
            <div className="flex flex-none items-center justify-between gap-1 bg-black/5 px-1.5 py-1">
              <p className="min-w-0 truncate text-[10px] text-black/40">Tap a side for the winner</p>
              <button
                type="button"
                disabled={isBusy}
                title="Mark this game done with no winner recorded"
                onClick={() =>
                  startMarkDoneTransition(() => queueableAdvanceGameStatus(isOnline, game.id, game.status))
                }
                className="flex-none text-[10px] font-medium text-black/40 underline decoration-dotted underline-offset-2 transition-colors hover:text-brand disabled:opacity-50"
              >
                No winner
              </button>
            </div>
          )}
        </div>
      )}
    </EditGameButton>
  );
}

function TeamHalf({
  names,
  armed,
  disabled,
  onTap,
  netSide = false,
}: {
  names: (string | null | undefined)[];
  armed: boolean;
  disabled: boolean;
  onTap: () => void;
  /** The left half draws the thick "net" divider on its own right edge. */
  netSide?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onTap}
      className={`grid flex-1 grid-rows-2 divide-y divide-white/40 transition-colors disabled:cursor-not-allowed ${
        netSide ? "border-r-[3px] border-white/90" : ""
      } ${armed ? "bg-black/20" : "hover:bg-white/10 active:bg-white/15"}`}
    >
      <PlayerCell name={names[0]} />
      <PlayerCell name={names[1]} />
    </button>
  );
}

function PlayerCell({ name }: { name?: string | null }) {
  return (
    <div className="flex min-w-0 items-center justify-center px-1.5 py-2 text-center">
      <span className="break-words text-base font-bold leading-tight text-white">{name ?? "—"}</span>
    </div>
  );
}
