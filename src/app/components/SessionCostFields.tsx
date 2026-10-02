"use client";

import { useState } from "react";
import { useSport } from "@/app/components/ClubContext";
import type { FeeMode } from "@/lib/types";

/**
 * The cost inputs shared by the Start Session and Edit Session forms:
 * how players are charged (split the real costs, or a flat fixed fee), plus
 * the court and shuttle/ball costs. In fixed mode the costs are optional —
 * they're only used to show the club's real profit on the Sessions page.
 */
export function SessionCostFields({
  defaults,
  autoFocus = false,
}: {
  defaults?: {
    fee_mode: FeeMode;
    fixed_fee: number;
    hours: number;
    fee_per_hour: number;
    shuttle_tube_cost: number;
  };
  autoFocus?: boolean;
}) {
  const { copy } = useSport();
  const [mode, setMode] = useState<FeeMode>(defaults?.fee_mode ?? "split");
  const input = "w-full rounded border border-black/15 px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-brand">How players pay</label>
        <input type="hidden" name="fee_mode" value={mode} />
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/5 p-1">
          {(
            [
              ["split", "Split costs"],
              ["fixed", "Fixed rate"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                mode === value ? "bg-white text-brand shadow-sm" : "text-black/50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-black/45">
          {mode === "split"
            ? `Court time and ${copy.itemLower}s are shared by whoever plays, rounded up to a friendly amount.`
            : "Everyone pays the same flat fee — great for open play."}
        </p>
      </div>

      {mode === "fixed" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-brand">Fee per player (₱)</label>
          <input
            type="number"
            name="fixed_fee"
            step="1"
            min="1"
            required
            autoFocus={autoFocus}
            defaultValue={defaults?.fixed_fee || ""}
            placeholder="e.g. 150"
            className={input}
          />
        </div>
      )}

      {mode === "fixed" && (
        <p className="-mb-1 text-xs font-semibold uppercase tracking-wide text-black/35">
          Your costs (optional — for profit tracking)
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-brand">Court hours</label>
          <input
            type="number"
            name="hours"
            step="0.5"
            min="0"
            defaultValue={defaults?.hours}
            autoFocus={autoFocus && mode === "split"}
            className={input}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-brand">Fee / hour</label>
          <input
            type="number"
            name="fee_per_hour"
            step="0.01"
            min="0"
            defaultValue={defaults?.fee_per_hour}
            className={input}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-brand">{copy.costLabel}</label>
        <input
          type="number"
          name="shuttle_tube_cost"
          step="0.01"
          min="0"
          defaultValue={defaults?.shuttle_tube_cost}
          className={input}
        />
        <p className="mt-1 text-xs text-black/40">{copy.costHint}</p>
      </div>
    </div>
  );
}
