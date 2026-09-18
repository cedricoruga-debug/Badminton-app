"use client";

import { useState, useTransition } from "react";
import { markPaid, removePlayerFromSession, setDoneForSession, unmarkPaid } from "@/app/actions";
import { Modal } from "@/app/components/Modal";
import { IconPeso, IconPhone, IconTrash } from "@/app/components/icons";
import type { GameWithPlayers } from "@/lib/queries";
import type { PlayerSessionWithPlayer } from "@/lib/types";

const GAME_STATUS_STYLES: Record<string, string> = {
  Ongoing: "bg-amber-100 text-amber-800",
  Done: "bg-green-100 text-green-800",
};

/**
 * A player's row for a session — clickable to open a popup with their full
 * details: games played, payment status and actions, and the list of games
 * they've actually played (Ongoing/Done, same set the game-count/payable
 * figures are built from). The row itself stays a compact summary; `games`
 * is the session's full game list, filtered here to just this player's.
 */
export function PlayerSessionRow({
  ps,
  games = [],
}: {
  ps: PlayerSessionWithPlayer;
  games?: GameWithPlayers[];
}) {
  const [isPending, startTransition] = useTransition();
  const [payPending, startPayTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const playedGames = games
    .filter(
      (g) =>
        g.status !== "Queued" &&
        [g.player1_id, g.player2_id, g.player3_id, g.player4_id].includes(ps.player_id)
    )
    .sort((a, b) => a.game_number - b.game_number);

  return (
    <li className="border-b border-black/10 last:border-b-0">
      <Modal
        label={ps.player.name}
        icon={null}
        title={ps.player.name}
        size="sm"
        trigger={(open) => (
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
            className="-mx-2 flex cursor-pointer items-start justify-between gap-2 rounded-lg px-2 py-3 transition-colors hover:bg-black/[0.03]"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold">{ps.player.name}</p>
              <p className="text-sm text-black/50">{ps.total_games}</p>
            </div>

            <div className="flex flex-none flex-col items-end gap-2">
              <p className="font-semibold">₱{ps.payable.toFixed(2)}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  title={
                    ps.done_for_session
                      ? "Done for this session — click to make active again"
                      : "Mark done for this session (hides them from the New Game picker)"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    startTransition(() => setDoneForSession(ps.id, !ps.done_for_session));
                  }}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                    ps.done_for_session
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-black/5 text-black/40 hover:bg-black/10"
                  }`}
                >
                  {ps.done_for_session ? "Done" : "Mark done"}
                </button>

                {ps.done_for_session &&
                  (ps.payment_method ? (
                    <button
                      type="button"
                      disabled={payPending}
                      title={`Paid — ${
                        ps.payment_method === "Cash" ? "Cash" : "GCash"
                      } (click to mark as unpaid)`}
                      onClick={(e) => {
                        e.stopPropagation();
                        startPayTransition(() => unmarkPaid(ps.id));
                      }}
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                        ps.payment_method === "Cash"
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}
                    >
                      {ps.payment_method === "Cash" ? (
                        <IconPeso className="h-3 w-3" />
                      ) : (
                        <IconPhone className="h-3 w-3" />
                      )}
                      {ps.payment_method === "Cash" ? "Cash" : "GCash"}
                    </button>
                  ) : (
                    <>
                      <button
                        disabled={payPending}
                        title="Mark paid — Cash"
                        onClick={(e) => {
                          e.stopPropagation();
                          startPayTransition(() => markPaid(ps.id, "Cash"));
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50"
                      >
                        <IconPeso className="h-3.5 w-3.5" />
                      </button>
                      <button
                        disabled={payPending}
                        title="Mark paid — GCash"
                        onClick={(e) => {
                          e.stopPropagation();
                          startPayTransition(() => markPaid(ps.id, "Gcash"));
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200 disabled:opacity-50"
                      >
                        <IconPhone className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ))}

                {confirmingDelete ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isPending}
                      title={`Remove ${ps.player.name} from this session`}
                      onClick={(e) => {
                        e.stopPropagation();
                        startTransition(() => removePlayerFromSession(ps.id, ps.session_id));
                      }}
                      className="rounded bg-red-500 px-2 py-1 text-[10px] font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                    >
                      Remove
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
                    disabled={isPending}
                    title="Remove from session"
                    aria-label="Remove from session"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmingDelete(true);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      >
        {(close) => (
          <div className="space-y-5">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-black/50">Games played</dt>
                <dd className="text-base font-semibold">{ps.total_games}</dd>
              </div>
              <div>
                <dt className="text-black/50">Amount payable</dt>
                <dd className="text-base font-semibold">₱{ps.payable.toFixed(2)}</dd>
              </div>
            </dl>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-black/40">Payment</p>
                <button
                  type="button"
                  disabled={isPending}
                  title={
                    ps.done_for_session
                      ? "Done for this session — click to make active again"
                      : "Mark done for this session (hides them from the New Game picker)"
                  }
                  onClick={() => startTransition(() => setDoneForSession(ps.id, !ps.done_for_session))}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                    ps.done_for_session
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-black/5 text-black/40 hover:bg-black/10"
                  }`}
                >
                  {ps.done_for_session ? "Done" : "Mark done"}
                </button>
              </div>
              {ps.done_for_session ? (
                ps.payment_method ? (
                  <button
                    type="button"
                    disabled={payPending}
                    title="Click to mark as unpaid"
                    onClick={() => startPayTransition(() => unmarkPaid(ps.id))}
                    className={`flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                      ps.payment_method === "Cash"
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    }`}
                  >
                    {ps.payment_method === "Cash" ? (
                      <IconPeso className="h-3.5 w-3.5" />
                    ) : (
                      <IconPhone className="h-3.5 w-3.5" />
                    )}
                    Paid — {ps.payment_method === "Cash" ? "Cash" : "GCash"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={payPending}
                      onClick={() => startPayTransition(() => markPaid(ps.id, "Cash"))}
                      className="flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50"
                    >
                      <IconPeso className="h-3.5 w-3.5" />
                      Mark paid — Cash
                    </button>
                    <button
                      type="button"
                      disabled={payPending}
                      onClick={() => startPayTransition(() => markPaid(ps.id, "Gcash"))}
                      className="flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 disabled:opacity-50"
                    >
                      <IconPhone className="h-3.5 w-3.5" />
                      Mark paid — GCash
                    </button>
                  </div>
                )
              ) : (
                <p className="text-sm text-black/40">
                  Mark this player done for the session to record payment.
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-black/40">
                Games played ({playedGames.length})
              </p>
              {playedGames.length === 0 ? (
                <p className="text-sm text-black/40">No games played yet.</p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
                  {playedGames.map((g) => {
                    const names = [g.player1, g.player2, g.player3, g.player4]
                      .map((p) => p?.name ?? "—")
                      .join(" / ");
                    return (
                      <li
                        key={g.id}
                        className="flex items-center justify-between gap-2 rounded bg-black/[0.03] px-2 py-1.5 text-sm"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-black/40">Game {g.game_number}</span> — {names}
                        </span>
                        <span
                          className={`flex-none rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            GAME_STATUS_STYLES[g.status] ?? "bg-black/5 text-black/50"
                          }`}
                        >
                          {g.status}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-black/10 pt-4">
              {confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    title={`Remove ${ps.player.name} from this session`}
                    onClick={() =>
                      startTransition(() => removePlayerFromSession(ps.id, ps.session_id))
                    }
                    className="rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    Remove from session
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded px-2 py-1.5 text-xs font-medium text-black/50 hover:bg-black/5"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirmingDelete(true)}
                  className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
                >
                  <IconTrash className="h-3.5 w-3.5" />
                  Remove from session
                </button>
              )}

              <button
                type="button"
                onClick={close}
                className="rounded px-3 py-1.5 text-xs font-medium text-black/50 hover:bg-black/5"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </li>
  );
}
