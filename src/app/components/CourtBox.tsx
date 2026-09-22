"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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
 * look like it. Marked up like a real court, not just a green rectangle:
 * an outer boundary, the net (the thick center line) splitting it into the
 * two teams left vs. right, and a short service line near the net on each
 * side. Broadcast-angle style — player1 + player2 on the left, player3 +
 * player4 on the right, each name sitting in its own corner — same 2-vs-2
 * layout the New Game/edit form uses to pick players, and both rows share
 * the exact same green (no shading difference between them).
 *
 * Each half is its own tap target — a shortcut for the single most common
 * thing that happens to an Ongoing game: it ends, and one side won. Tap a
 * side and that same half turns brand-pink with its team name and a
 * Confirm button — the confirmation lives right where you tapped, not in a
 * shared strip somewhere else on the card. There's no separate Cancel:
 * tapping anywhere outside the card backs out on its own, the same way a
 * dropdown or popover closes, and tapping the *other* side switches to it
 * directly. Confirm marks the game Done with that team as winner, no trip
 * through the Edit Game popup needed. That popup — opened from the header
 * bar's pencil — is still there for anything this shortcut doesn't cover:
 * swapping a player, correcting a winner, adding a score, or marking a
 * game done with no winner recorded at all ("No winner" below).
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
  const cardRef = useRef<HTMLDivElement>(null);

  const team1Names = [game.player1?.name, game.player2?.name];
  const team2Names = [game.player3?.name, game.player4?.name];

  function confirmWinner(team: "team1" | "team2") {
    startFinishTransition(async () => {
      await queueableFinishGameWithWinner(isOnline, game.id, team);
      setArmedTeam(null);
    });
  }

  // Tapping anywhere outside this card backs out of an armed side, same as
  // a Cancel button would — one less button crowding an already-narrow
  // court half, and it's what people reach for instinctively anyway.
  useEffect(() => {
    if (!armedTeam) return;
    function handlePointerDown(e: PointerEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setArmedTeam(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [armedTeam]);

  return (
    <EditGameButton game={game} sessions={sessions} players={players} games={games}>
      {(open) => (
        <div ref={cardRef} className="flex flex-col overflow-hidden rounded-xl shadow-soft ring-1 ring-black/10">
          <button
            type="button"
            onClick={open}
            title="Edit this game"
            className="flex flex-none items-center justify-center gap-1.5 bg-black/80 px-1.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-black/70"
          >
            Game {game.game_number}
            <IconEdit className="h-3 w-3 opacity-50" />
          </button>

          {/* The court itself: an outer boundary, the net down the middle,
           * and a short service line near the net on each side — 2 players
           * a side, each half its own tap target for the winner shortcut
           * and, once armed, its own Confirm. Wider than tall — the net
           * runs down the middle instead of across it — with room for a
           * name to wrap to a second line rather than truncate. */}
          <div className="flex min-h-[140px] flex-1 flex-row border-2 border-white/60 bg-emerald-600">
            <TeamHalf
              names={team1Names}
              armed={armedTeam === "team1"}
              disabled={isBusy}
              onTap={() => setArmedTeam((prev) => (prev === "team1" ? null : "team1"))}
              onConfirm={() => confirmWinner("team1")}
              netEdge="right"
            />
            <TeamHalf
              names={team2Names}
              armed={armedTeam === "team2"}
              disabled={isBusy}
              onTap={() => setArmedTeam((prev) => (prev === "team2" ? null : "team2"))}
              onConfirm={() => confirmWinner("team2")}
              netEdge="left"
            />
          </div>

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
  netEdge,
}: {
  names: (string | null | undefined)[];
  armed: boolean;
  disabled: boolean;
  onTap: () => void;
  onConfirm: () => void;
  /** Which of this half's edges sits against the net — the thick net line
   * is drawn on that edge, and the thin short-service-line marker sits a
   * little way in from it, same as a real court. */
  netEdge: "left" | "right";
}) {
  const netBorder = netEdge === "right" ? "border-r-[3px] border-white/90" : "";
  const serviceLinePosition = netEdge === "right" ? "right-[22%]" : "left-[22%]";

  if (armed) {
    const teamLabel = names.filter(Boolean).join(" & ") || "—";
    return (
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-1.5 bg-brand px-2 py-2 ${netBorder}`}
      >
        <p className="text-center text-sm font-bold leading-tight text-white">{teamLabel}</p>
        <p className="text-[9px] font-semibold uppercase tracking-wide text-white/70">Won?</p>
        <button
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          className="w-full rounded-md bg-white py-1.5 text-[11px] font-bold text-brand-dark transition-colors hover:bg-white/90 disabled:opacity-50"
        >
          Confirm
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onTap}
      className={`relative grid flex-1 grid-rows-2 divide-y divide-white/60 transition-colors disabled:cursor-not-allowed hover:bg-white/10 active:bg-white/15 ${netBorder}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 w-0 border-r border-white/40 ${serviceLinePosition}`}
      />
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
