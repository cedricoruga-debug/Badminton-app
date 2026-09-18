"use client";

import { useState, useTransition } from "react";
import { deleteGame } from "@/app/actions";
import { SubmitButton } from "@/app/components/SubmitButton";
import type { PlayerSessionWithPlayer } from "@/lib/types";

type SessionOption = { id: string; session_date: string };

const STATUSES: Array<{ value: "Queued" | "Ongoing" | "Done"; label: string }> = [
  { value: "Queued", label: "New" },
  { value: "Ongoing", label: "Ongoing" },
  { value: "Done", label: "Done" },
];


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
                          ? "cursor-not-allowed border-black/10 text-black/30"
                          : "cursor-pointer border-black/15 text-black/70 hover:border-brand/40"
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
  );
}
