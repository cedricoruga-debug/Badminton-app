"use client";

import { useState, useTransition } from "react";
import { deleteGame } from "@/app/actions";
import { EditGameButton } from "@/app/components/EditGameButton";
import { IconTrash } from "@/app/components/icons";
import { queueableAdvanceGameStatus, useIsOnline } from "@/lib/offlineQueue";
import type { GameWithPlayers } from "@/lib/queries";
import type { Game, PlayerSessionWithPlayer } from "@/lib/types";

type SessionOption = { id: string; session_date: string };
type GameForStatus = Pick<Game, "id" | "game_number" | "status" | "player1_id" | "player2_id" | "player3_id" | "player4_id">;

const STATUS_STYLES: Record<string, string> = {
  Queued: "bg-brand-light text-brand",
  Ongoing: "bg-amber-100 text-amber-800",
  Done: "bg-green-100 text-green-800",
};

export function GameRow({
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
  const [isDeleting, startDeleteTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const isOnline = useIsOnline();
  const names = [game.player1, game.player2, game.player3, game.player4]
    .map((p) => p?.name ?? "—")
    .join(" / ");

  return (
    <li className="border-b border-black/10 last:border-b-0">
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
            className="-mx-2 flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-black/[0.03]"
          >
            <div className="min-w-0">
              <p
                className="truncate font-bold text-black"
                style={{
                  fontFamily:
                    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                }}
              >
                {names}
              </p>
              <p className="text-xs text-black/40">
                Game {game.game_number}
                {game.winner_team && (
                  <>
                    {" · "}
                    <span className="font-medium text-emerald-700">
                      {game.winner_team === "team1"
                        ? `${game.player1?.name ?? "Team 1"} / ${game.player2?.name ?? ""}`
                        : `${game.player3?.name ?? "Team 2"} / ${game.player4?.name ?? ""}`}{" "}
                      won
                    </span>
                    {(game.score1 !== null || game.score2 !== null) &&
                      ` (${game.score1 ?? "–"}-${game.score2 ?? "–"})`}
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-none items-center gap-2">
              <div className="flex flex-none flex-col items-end gap-1.5">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    STATUS_STYLES[game.status] ?? STATUS_STYLES.Queued
                  }`}
                >
                  {game.status}
                </span>
                {game.status !== "Done" && (
                  <button
                    type="button"
                    disabled={isPending}
                    title={game.status === "Queued" ? "Start this game" : "Mark this game done"}
                    onClick={(e) => {
                      e.stopPropagation();
                      startTransition(() => queueableAdvanceGameStatus(isOnline, game.id, game.status));
                    }}
                    className="whitespace-nowrap rounded border border-brand/30 px-2 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-brand-light disabled:opacity-50"
                  >
                    {/* Says what tapping it actually does next, instead of
                     * the generic "Move forward" — same wording style as
                     * the court boxes' "Ongoing — mark done" button. */}
                    {game.status === "Queued" ? "Start game →" : "Mark done ✓"}
                  </button>
                )}
              </div>

              {confirmingDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isDeleting}
                    title={`Delete Game ${game.game_number}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startDeleteTransition(() => deleteGame(game.id, game.session_id));
                    }}
                    className="rounded bg-red-500 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingDelete(false);
                    }}
                    className="rounded px-1.5 py-1 text-[10px] font-medium text-black/50 hover:bg-black/5"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isDeleting}
                  title="Delete game"
                  aria-label="Delete game"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmingDelete(true);
                  }}
                  className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </EditGameButton>
    </li>
  );
}
