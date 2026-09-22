"use client";

import { useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
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
 * "Magic Queue"-style auto-suggest: picks up to 4 free players for the next
 * match instead of the queue master choosing every one by hand. Weighted
 * by, in priority order: hasn't played yet / waited longest since their
 * last game, then fewest games played overall as a tiebreak, while
 * preferring not to just replay the exact same 4 who were in the last
 * completed/ongoing game (falls back to including them anyway if there
 * aren't 4 free alternatives). Pure function so it's easy to reason about
 * independent of the component's render.
 */
function suggestNextMatch(
  players: PlayerSessionWithPlayer[],
  games: GameForStatus[],
  playerStatus: Map<string, "queued" | "ongoing">
): string[] {
  const free = players.filter((ps) => !playerStatus.has(ps.player.id));
  if (free.length === 0) return [];

  const maxGameNumber = games.reduce((max, g) => Math.max(max, g.game_number), 0);

  function waitScore(ps: PlayerSessionWithPlayer): number {
    const played = games.filter(
      (g) =>
        g.status !== "Queued" &&
        [g.player1_id, g.player2_id, g.player3_id, g.player4_id].includes(ps.player.id)
    );
    // Hasn't played at all yet this session — top priority, ahead of
    // anyone who has, no matter how long ago their last game was.
    if (played.length === 0) return Number.POSITIVE_INFINITY;
    const lastPlayed = Math.max(...played.map((g) => g.game_number));
    return maxGameNumber - lastPlayed;
  }

  const ranked = free
    .map((ps) => ({ ps, wait: waitScore(ps) }))
    .sort((a, b) => {
      if (a.wait !== b.wait) return b.wait - a.wait;
      return a.ps.total_games - b.ps.total_games;
    });

  const lastPlayedGame = [...games]
    .filter((g) => g.status !== "Queued")
    .sort((a, b) => b.game_number - a.game_number)[0];
  const justPlayedTogether = new Set(
    lastPlayedGame
      ? [
          lastPlayedGame.player1_id,
          lastPlayedGame.player2_id,
          lastPlayedGame.player3_id,
          lastPlayedGame.player4_id,
        ].filter((id): id is string => Boolean(id))
      : []
  );

  const picked: string[] = [];
  for (const { ps } of ranked) {
    if (picked.length >= 4) break;
    if (justPlayedTogether.has(ps.player.id)) continue;
    picked.push(ps.player.id);
  }
  // Couldn't fill 4 without them (small free pool) — take another pass and
  // include them rather than suggesting fewer than 4 players.
  if (picked.length < 4) {
    for (const { ps } of ranked) {
      if (picked.length >= 4) break;
      if (!picked.includes(ps.player.id)) picked.push(ps.player.id);
    }
  }

  return picked;
}

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
  defaultWinnerTeam = null,
  defaultScore1 = null,
  defaultScore2 = null,
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
  /** 'team1' = player1+player2, 'team2' = player3+player4 — only shown/used
   * once status is Done. */
  defaultWinnerTeam?: "team1" | "team2" | null;
  defaultScore1?: number | null;
  defaultScore2?: number | null;
  submitLabel?: string;
  /** Where `action` should redirect after saving (create only — "/" by
   * default). Lets a page like Games keep you on itself after adding one. */
  redirectTo?: string;
  close: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(defaultPlayerIds);
  const [status, setStatus] = useState(defaultStatus);
  const [winnerTeam, setWinnerTeam] = useState(defaultWinnerTeam);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  // Where to portal the history-panel row: right under the modal's own
  // dialog box (not the bottom of the viewport), so it stays close instead
  // of leaving a big gap on short forms. Tracks the dialog's live bottom
  // edge (via the data-modal-dialog element Modal.tsx renders) so it stays
  // put if the dialog resizes — e.g. the "Playing now" legend appearing.
  const formRef = useRef<HTMLFormElement>(null);
  const [panelTop, setPanelTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    const dialog = formRef.current?.closest<HTMLElement>("[data-modal-dialog]");
    if (!dialog) return;
    const update = () => setPanelTop(dialog.getBoundingClientRect().bottom + 8);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(dialog);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

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
      <form ref={formRef} action={action} className="space-y-6">
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
                checked={status === value}
                onChange={() => setStatus(value)}
                className="peer sr-only"
              />
              <span className="block cursor-pointer rounded bg-black/5 px-4 py-2 text-center text-sm font-medium text-black/60 peer-checked:bg-brand peer-checked:text-white">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Winner/score — optional, only meaningful once the game is Done.
       * Doesn't block saving: a game can be marked Done with no winner
       * recorded, same as before this existed. */}
      {status === "Done" && (
        <fieldset>
          <legend className="mb-2 block text-sm font-medium">Winner (optional)</legend>
          <div className="flex gap-2">
            {(
              [
                { value: null, label: "Not recorded" },
                { value: "team1" as const, label: "Team 1" },
                { value: "team2" as const, label: "Team 2" },
              ] satisfies Array<{ value: "team1" | "team2" | null; label: string }>
            ).map(({ value, label }) => (
              <label key={label} className="flex-1">
                <input
                  type="radio"
                  name="winner_team"
                  value={value ?? ""}
                  checked={winnerTeam === value}
                  onChange={() => setWinnerTeam(value)}
                  className="peer sr-only"
                />
                <span className="block cursor-pointer rounded bg-black/5 px-3 py-1.5 text-center text-xs font-medium text-black/60 peer-checked:bg-brand peer-checked:text-white">
                  {label}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              name="score1"
              min={0}
              defaultValue={defaultScore1 ?? ""}
              placeholder="Team 1 score"
              className="w-full min-w-0 rounded border border-black/15 px-2 py-1.5 text-sm"
            />
            <span className="flex-none text-xs text-black/30">–</span>
            <input
              type="number"
              name="score2"
              min={0}
              defaultValue={defaultScore2 ?? ""}
              placeholder="Team 2 score"
              className="w-full min-w-0 rounded border border-black/15 px-2 py-1.5 text-sm"
            />
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
          <span>New game (pick up to 4)</span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              title="Auto-pick 4 players — weighted by who's waited longest and hasn't just played together"
              onClick={() => setSelected(suggestNextMatch(players, games, playerStatus))}
              className="rounded-full border border-brand/30 px-2 py-0.5 text-[11px] font-medium text-brand transition-colors hover:bg-brand-light"
            >
              ✨ Suggest
            </button>
            <span className="font-normal text-black/40">{selected.length}/4</span>
          </span>
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
            className="rounded btn-brand px-4 py-2 text-sm font-medium text-white"
            pendingLabel="Saving…"
          >
            {submitLabel}
          </SubmitButton>
        </div>
      </div>
      </form>

      {/* One small floating card per currently-picked player, portaled to
       * the page body (below the modal, not inside it) so picking someone
       * immediately shows "have they already played with X today" without
       * an extra click or leaving the form. Laid out in a row (wrapping if
       * it doesn't fit) rather than stacked, positioned just under the
       * modal's own dialog box (see panelTop above) so it sits close to
       * the form instead of pinned to the bottom of the screen. */}
      {selected.length > 0 &&
        createPortal(
          <div
            className={`pointer-events-none fixed inset-x-0 z-[60] flex flex-row flex-wrap items-start justify-center gap-2 px-4 ${
              panelTop === null ? "bottom-3" : ""
            }`}
            style={panelTop !== null ? { top: panelTop } : undefined}
          >
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
