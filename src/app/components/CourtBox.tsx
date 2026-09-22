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
 * side and that same half turns into its own Confirm/Cancel — the
 * confirmation lives right where you tapped, not in a shared strip
 * somewhere else on the card, so it's obvious which side you're about to
 * commit. Tapping the *other* side switches to it instead (no need to
 * cancel first). Confirm marks the game Done with that team as winner, no
 * trip through the Edit Game popup needed. That popup — opened from the
 * header bar's pencil — is still there for anything this shortcut doesn't
 * cover: swapping a player, correcting a winner, adding a score, or
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

  function confirmWinner(team: "team1" | "team2") {
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
           * half its own tap target for the winner shortcut — and, once
           * armed, its own Confirm/Cancel. Wider than it is tall — the net
           * runs down the middle instead of across it — with room for a
           * name to wrap to a second line rather than truncate. */}
          <div className="flex min-h-[140px] flex-1 flex-row bg-emerald-600">
            <TeamHalf
              names={team1Names}
              armed={armedTeam === "team1"}
              disabled={isBusy}
              onTap={() => setArmedTeam((prev) => (prev === "team1" ? null : "team1"))}
              onConfirm={() => confirmWinner("team1")}
              onCancel={() => setArmedTeam(null)}
              netSide
            />
            <TeamHalf
              names={team2Names}
              armed={armedTeam === "team2"}
              disabled={isBusy}
              onTap={() => setArmedTeam((prev) => (prev === "team2" ? null : "team2"))}
              onConfirm={() => confirmWinner("team2")}
              onCancel={() => setArmedTeam(null)}
            />
          </div>

          {/* Hidden while a side's armed — its own Confirm/Cancel already
           * covers "back out", so this footer would just be a second,
           * redundant way out competing for a tap right next to it. */}
          {!armedTeam && (
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
  onConfirm,
  onCancel,
  netSide = false,
}: {
  names: (string | null | undefined)[];
  armed: boolean;
  disabled: boolean;
  onTap: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  /** The left half draws the thick "net" divider on its own right edge. */
  netSide?: boolean;
}) {
  const netBorder = netSide ? "border-r-[3px] border-white/90" : "";

  if (armed) {
    const teamLabel = names.filter(Boolean).join(" & ") || "—";
    return (
      <div className={`flex flex-1 flex-col items-center justify-center gap-1.5 bg-amber-400 px-2 py-2 ${netBorder}`}>
        <p className="text-center text-sm font-bold leading-tight text-amber-950">{teamLabel}</p>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-amber-900/70">Won?</p>
        <div className="flex w-full flex-col gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={onConfirm}
            className="rounded-md bg-amber-950 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onCancel}
            className="rounded-md bg-white/70 py-1 text-[10px] font-medium text-amber-950 transition-colors hover:bg-white disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onTap}
      className={`grid flex-1 grid-rows-2 divide-y divide-white/40 transition-colors disabled:cursor-not-allowed hover:bg-white/10 active:bg-white/15 ${netBorder}`}
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
