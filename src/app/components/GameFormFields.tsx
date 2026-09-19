"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { deleteGame } from "@/app/actions";
import { PlayerHistoryPanel } from "@/app/components/PlayerHistoryPanel";
import { SubmitButton } from "@/app/components/SubmitButton";
import type { Game, PlayerSessionWithPlayer } from "@/lib/types";

type SessionOption = { id: string; session_date: string };

const STATUSES: Array<{ value: "Queued" | "Ongoing" | "Done"; label: string }> = [
  { value: "Queued", label: "New" },
  { value: "Ongoing", label: "Ongoing" },
  { value: "Done", label: "Done" },
];

type GameForStatus = Pick<Game, "id" | "game_number" | "status" | "player1_id" | "player2_id" | "player3_id" | "player4_id">;

/** Subtle badge colors for a player's current standing this session — kept
 * light (pale background, matching-tone border/text) so the name stays easy
 * to read, not a solid color block. */
const PICKER_STATUS_STYLES = {
  free: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-400",
  queued: "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400",
  ongoing: "border-red-200 bg-red-50 text-red-800 hover:border-red-400",
} as const;


/**
 * Shared body for the New Game and Edit Game forms. Kept as its own
 * component (rather than inline in a Modal's render prop) so its selection
 * state is a fresh mount every time the modal opens — Modal unmounts its
 * children while closed, so this naturally resets.
 */
export function GameFormFields({
  action,
  gameId,
  sessionId,
  sessions,
  defaultSessionId,
  players,
  games = [],
  defaultStatus = "Queued",
  defaultPlayerIds = [],
  submitLabel = "Save",
  redirectTo,
  close,
}: {
  action: (formData: FormData) => void;
  gameId?: string;
  /** The game's actual session (for deleting) — stable even if the "Session
   * date" dropdown below gets changed before saving. Only needed when
   * editing (gameId is set). */
  sessionId?: string;
  sessions: SessionOption[];
  defaultSessionId: string;
  players: PlayerSessionWithPlayer[];
  /** Every other game in this session (any status) — used only to color the
   * player picker below by who's free, already queued elsewhere, or
   * currently playing. Optional; with none given (or omitted) everyone just
   * shows as free. */
  games?: GameForStatus[];
  defaultStatus?: "Queued" | "Ongoing" | "Done";
  defaultPlayerIds?: string[];
  submitLabel?: string;
  /** Where `action` should redirect after saving (create only — "/" by
   * default). Lets a page like Games keep you on itself after adding one. */
  redirectTo?: string;
  close: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(defaultPlayerIds);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  // Who's already spoken for this session, excluding this very game (its
  // own roster shouldn't count as "already busy" — those players show as
  // selected/checked instead, via `selected`). Ongoing always wins over
  // Queued if a player somehow shows up in both.
  const playerStatus = useMemo(() => {
    const status = new Map<string, "queued" | "ongoing">();
    for (const g of games) {
      if (g.id === gameId || g.status !== "Queued") continue;
      for (const pid of [g.player1_id, g.player2_id, g.player3_id, g.player4_id]) {
        if (pid) status.set(pid, "queued");
      }
    }
    for (const g of games) {
      if (g.id === gameId || g.status !== "Ongoing") continue;
      for (const pid of [g.player1_id, g.player2_id, g.player3_id, g.player4_id]) {
        if (pid) status.set(pid, "ongoing");
      }
    }
    return status;
  }, [games, gameId]);

  // player_id -> name, for the game-history panels below — each game row on
  // `games` only has ids, this fills in the names for the other 3 slots.
  const nameById = useMemo(() => new Map(players.map((ps) => [ps.player.id, ps.player.name])), [players]);

  function toggle(playerId: string) {
    setSelected((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= 4) return prev;
      return [...prev, playerId];
    });
  }

  function handleDelete() {
    if (!gameId || !sessionId) return;
    startDeleteTransition(async () => {
      await deleteGame(gameId, sessionId);
      close();
    });
  }

  return (
    <>
      <form action={action} className="space-y-6">
      {gameId && <input type="hidden" name="game_id" value={gameId} />}
      {redirectTo && <input type="hidden" name="redirect_to" value={redirectTo} />}

      <div>
        <label className="mb-1 block text-sm font-medium text-brand">Session date</label>
        <select
          name="session_id"
          defaultValue={defaultSessionId}
          required
          className="w-full rounded border border-black/15 px-3 py-2 text-sm"
        >
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {new Date(s.session_date).toLocaleDateString("en-US")}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-2 block text-sm font-medium">Status</legend>
        <div className="flex gap-2">
          {STATUSES.map(({ value, label }) => (
            <label key={value} className="flex-1">
              <input
                type="radio"
                name="status"
                value={value}
                defaultChecked={defaultStatus === value}
                className="peer sr-only"
              />
              <span className="block cursor-pointer rounded bg-black/5 px-4 py-2 text-center text-sm font-medium text-black/60 peer-checked:bg-brand peer-checked:text-white">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
          <span>New game (pick up to 4)</span>
          <span className="font-normal text-black/40">{selected.length}/4</span>
        </legend>
        {players.length === 0 ? (
          <p className="text-sm text-black/40">No players registered for this session yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {players.map((ps) => {
              const checked = selected.includes(ps.player.id);
              const disabled = !checked && selected.length >= 4;
              const status = playerStatus.get(ps.player.id);
              const statusClasses =
                status === "ongoing"
                  ? PICKER_STATUS_STYLES.ongoing
                  : status === "queued"
                    ? PICKER_STATUS_STYLES.queued
                    : PICKER_STATUS_STYLES.free;
              return (
                <label key={ps.player.id}>
                  <input
                    type="checkbox"
                    name="player_id"
                    value={ps.player.id}
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggle(ps.player.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={`block rounded border px-3 py-1.5 text-sm transition-colors ${
                      checked
                        ? "cursor-pointer border-brand bg-brand text-white"
                        : disabled
                          ? `cursor-not-allowed opacity-50 ${statusClasses}`
                          : `cursor-pointer ${statusClasses}`
                    }`}
                  >
                    {ps.player.name}
                    <span className="ml-1 text-[10px] opacity-70">({ps.total_games})</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {games.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-black/40">
            <Legend swatch="bg-emerald-100 border-emerald-300" label="Not queued" />
            <Legend swatch="bg-amber-100 border-amber-300" label="Queued" />
            <Legend swatch="bg-red-100 border-red-300" label="Playing now" />
          </div>
        )}
      </fieldset>

      <div className="flex items-center justify-between border-t border-black/10 pt-4">
        <div>
          {gameId &&
            sessionId &&
            (confirmingDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-black/50">Delete this game?</span>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDelete}
                  className="rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="text-xs font-medium text-black/50 hover:text-brand"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="rounded px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete game
              </button>
            ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={close}
            className="rounded px-4 py-2 text-sm font-medium text-black/60 hover:bg-black/5"
          >
            Cancel
          </button>
          <SubmitButton
            className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            pendingLabel="Saving…"
          >
            {submitLabel}
          </SubmitButton>
        </div>
      </div>
      </form>

      {/* One small floating card per currently-picked player, portaled to
       * the very bottom of the page (below the modal, not inside it) so
       * picking someone immediately shows "have they already played with X
       * today" without an extra click or leaving the form. */}
      {selected.length > 0 &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
            {selected.map((playerId) => {
              const ps = players.find((p) => p.player.id === playerId);
              if (!ps) return null;
              return (
                <div key={playerId} className="pointer-events-auto">
                  <PlayerHistoryPanel
                    playerId={playerId}
                    playerName={ps.player.name}
                    games={games}
                    nameById={nameById}
                  />
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-full border ${swatch}`} />
      {label}
    </span>
  );
}
