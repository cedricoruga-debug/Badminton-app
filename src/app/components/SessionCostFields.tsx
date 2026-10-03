"use client";

import { useState } from "react";
import { useClub, useSport } from "@/app/components/ClubContext";
import type { CourtFeeType, Session } from "@/lib/types";

/**
 * Pricing inputs shared by the Start Session and Edit Session forms.
 *
 * New sessions use simple pricing — just two numbers the queue master
 * controls, so they decide exactly how much the club earns:
 *   1. Court fee, either the whole court rent (split evenly across everyone
 *      who plays) or a flat amount per player;
 *   2. Price per game, charged for every game a player plays.
 *
 * Sessions created before simple pricing existed keep their original
 * inputs (hours × rate + shuttle cost) when edited, so old totals don't move.
 */
export function SessionCostFields({ session, autoFocus = false }: { session?: Session; autoFocus?: boolean }) {
  const { copy } = useSport();
  const club = useClub();
  const [courtType, setCourtType] = useState<CourtFeeType>(session?.court_fee_type ?? "total");
  const input = "w-full rounded border border-black/15 px-3 py-2 text-sm";
  const roundNote = club?.round_up_buffer
    ? "Each player's total is rounded up to the next ₱10, plus ₱10."
    : "Each player pays exactly this — rounded up to the next peso.";

  // Editing: keep whatever model the session was created with. New
  // session: use the club's chosen pricing (club profile → Pricing).
  const useLegacy = session ? session.fee_mode !== "simple" : club?.default_fee_mode === "split";
  if (useLegacy) {
    return <LegacyFields session={session} costLabel={copy.costLabel} input={input} roundNote={roundNote} />;
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="fee_mode" value="simple" />
      <input type="hidden" name="court_fee_type" value={courtType} />

      <div>
        <label className="mb-1 block text-sm font-medium text-brand">Court fee</label>
        <div className="mb-2 grid grid-cols-2 gap-1 rounded-lg bg-black/5 p-1">
          {(
            [
              ["total", "Total court rent"],
              ["per_player", "Per player"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setCourtType(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                courtType === value ? "bg-white text-brand shadow-sm" : "text-black/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          type="number"
          name="court_amount"
          step="1"
          min="0"
          autoFocus={autoFocus}
          defaultValue={session?.court_amount || ""}
          placeholder={courtType === "total" ? "e.g. 1200" : "e.g. 100"}
          className={input}
        />
        <p className="mt-1 text-xs text-black/40">
          {courtType === "total"
            ? "The whole court rent — split evenly across everyone who plays."
            : "Every player pays this amount for the court."}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand">Price per game</label>
        <input
          type="number"
          name="per_game_fee"
          step="1"
          min="0"
          defaultValue={session?.per_game_fee || ""}
          placeholder="e.g. 20"
          className={input}
        />
        <p className="mt-1 text-xs text-black/40">
          Charged for each game a player plays (covers {copy.itemLower}s and your earnings). {roundNote}
        </p>
      </div>
    </div>
  );
}

/** The original pricing inputs: court hours × rate (split evenly across
 * players) + shuttle tube cost (one shuttle per game, shared by 4). Used for
 * sessions created that way, and for new sessions when the club's pricing
 * is set to it. */
function LegacyFields({
  session,
  costLabel,
  input,
  roundNote,
}: {
  session?: Session;
  costLabel: string;
  input: string;
  roundNote: string;
}) {
  const mode = session?.fee_mode ?? "split";
  return (
    <div className="space-y-4">
      <input type="hidden" name="fee_mode" value={mode} />
      {mode === "fixed" && <input type="hidden" name="fixed_fee" value={session?.fixed_fee ?? 0} />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-brand">Court hours</label>
          <input type="number" name="hours" step="0.5" min="0" defaultValue={session?.hours} className={input} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-brand">Fee / hour</label>
          <input type="number" name="fee_per_hour" step="0.01" min="0" defaultValue={session?.fee_per_hour} className={input} />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-brand">{costLabel}</label>
        <input type="number" name="shuttle_tube_cost" step="0.01" min="0" defaultValue={session?.shuttle_tube_cost} className={input} />
      </div>
      <p className="text-xs text-black/40">
        Court fee is split evenly across players; shuttles are charged per game played. {roundNote}
      </p>
    </div>
  );
}
