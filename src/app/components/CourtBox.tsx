"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSport } from "@/app/components/ClubContext";
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
 * two teams left vs. right, and on each side the short service line, the
 * doubles long service line, the singles sidelines, and the center line
 * (running back from the short service line). Broadcast-angle style — player1 + player2 on the left, player3 +
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
 *
 * Pickleball clubs get a pickleball court instead: blue playing surface,
 * the non-volley zone ("kitchen") shaded next to the net, and the center
 * line running from the kitchen line back to the baseline.
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
  const { sport } = useSport();
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
           * and the service/side/center lines on each side (see TeamHalf) — 2 players
           * a side, each half its own tap target for the winner shortcut
           * and, once armed, its own Confirm. Wider than tall — the net
           * runs down the middle instead of across it — with room for a
           * name to wrap to a second line rather than truncate. */}
          <div
            className={`flex min-h-[140px] flex-1 border-2 border-white/60 portrait:min-h-[250px] portrait:flex-col landscape:flex-row ${
              sport === "pickleball" ? "bg-sky-600" : "bg-emerald-600"
            }`}
          >
            <TeamHalf
              names={team1Names}
              armed={armedTeam === "team1"}
              disabled={isBusy}
              onTap={() => setArmedTeam((prev) => (prev === "team1" ? null : "team1"))}
              onConfirm={() => confirmWinner("team1")}
              netEdge="right"
              sport={sport}
            />
            <TeamHalf
              names={team2Names}
              armed={armedTeam === "team2"}
              disabled={isBusy}
              onTap={() => setArmedTeam((prev) => (prev === "team2" ? null : "team2"))}
              onConfirm={() => confirmWinner("team2")}
              netEdge="left"
              sport={sport}
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
  sport = "badminton",
}: {
  sport?: "badminton" | "pickleball";
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
  // Phones in portrait get a standing court (team 1 on top, net across
  // the middle, team 2 below) — a much better fit for a narrow screen.
  // Landscape keeps the sideways court (team 1 left, net down the middle).
  // Every line below therefore has a portrait: and a landscape: version.
  const first = netEdge === "right"; // team 1's half: net on its right / bottom
  const netBorder = first ? "border-white/90 portrait:border-b-[3px] landscape:border-r-[3px]" : "";

  // Badminton line positions, as a share of this half's length (net to
  // back edge = 6.7m) and width (6.1m): short service line 1.98m from the
  // net (~30%), doubles long service line 0.76m from the back (~11%),
  // singles sidelines 0.46m in from each side (~7.5%), and the center line
  // from the short service line back to the back edge.
  const H = "portrait:inset-x-0 portrait:h-0 portrait:border-t"; // across the court when standing
  const V = "landscape:inset-y-0 landscape:w-0 landscape:border-r"; // across the court when sideways
  const shortServiceLine = first
    ? `${H} portrait:bottom-[30%] ${V} landscape:right-[30%]`
    : `${H} portrait:top-[30%] ${V} landscape:left-[30%]`;
  const longServiceLine = first
    ? `${H} portrait:top-[11%] ${V} landscape:left-[11%]`
    : `${H} portrait:bottom-[11%] ${V} landscape:right-[11%]`;
  const sideline1 =
    "portrait:inset-y-0 portrait:left-[7.5%] portrait:w-0 portrait:border-l landscape:inset-x-0 landscape:top-[7.5%] landscape:h-0 landscape:border-t";
  const sideline2 =
    "portrait:inset-y-0 portrait:right-[7.5%] portrait:w-0 portrait:border-l landscape:inset-x-0 landscape:bottom-[7.5%] landscape:h-0 landscape:border-t";
  const centerLine = (len: "70" | "68") =>
    `portrait:left-1/2 portrait:w-0 portrait:border-l ${len === "70" ? "portrait:h-[70%] landscape:w-[70%]" : "portrait:h-[68%] landscape:w-[68%]"} landscape:top-1/2 landscape:h-0 landscape:border-t ${
      first ? "portrait:top-0 landscape:left-0" : "portrait:bottom-0 landscape:right-0"
    }`;
  // Pickleball kitchen: 7ft of each 22ft half (~32%), next to the net.
  const kitchen = first
    ? "portrait:inset-x-0 portrait:bottom-0 portrait:h-[32%] portrait:border-t landscape:inset-y-0 landscape:right-0 landscape:w-[32%] landscape:border-l"
    : "portrait:inset-x-0 portrait:top-0 portrait:h-[32%] portrait:border-b landscape:inset-y-0 landscape:left-0 landscape:w-[32%] landscape:border-r";

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
      className={`relative grid flex-1 portrait:grid-cols-2 landscape:grid-rows-2 transition-colors disabled:cursor-not-allowed hover:bg-white/10 active:bg-white/15 ${netBorder}`}
    >
      {/* Court markings — purely decorative, drawn under the names */}
      {sport === "pickleball" ? (
        <>
          <span aria-hidden="true" className={`pointer-events-none absolute border-white/60 bg-white/10 ${kitchen}`} />
          <span aria-hidden="true" className={`pointer-events-none absolute border-white/50 ${centerLine("68")}`} />
        </>
      ) : (
        <>
          <span aria-hidden="true" className={`pointer-events-none absolute border-white/45 ${shortServiceLine}`} />
          <span aria-hidden="true" className={`pointer-events-none absolute border-white/45 ${longServiceLine}`} />
          <span aria-hidden="true" className={`pointer-events-none absolute border-white/45 ${sideline1}`} />
          <span aria-hidden="true" className={`pointer-events-none absolute border-white/45 ${sideline2}`} />
          <span aria-hidden="true" className={`pointer-events-none absolute border-white/45 ${centerLine("70")}`} />
        </>
      )}
      <PlayerCell name={names[0]} />
      <PlayerCell name={names[1]} />
    </button>
  );
}

function PlayerCell({ name }: { name?: string | null }) {
  return (
    <div className="relative z-10 flex min-w-0 items-center justify-center px-1.5 py-2 text-center">
      <span className="break-words text-base font-bold leading-tight text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]">{name ?? "—"}</span>
    </div>
  );
}
