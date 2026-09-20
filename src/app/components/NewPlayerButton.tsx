"use client";

import { useState } from "react";
import { createPlayer } from "@/app/actions";
import { SubmitButton } from "@/app/components/SubmitButton";
import { IconUserPlus } from "@/app/components/icons";

type SessionOption = { id: string; session_date: string };

/**
 * "New player" shortcut icon for the dashboard's icon grid (matches the
 * New Game / Games / New Session icons in style and placement). Clicking it
 * expands an inline form in place — no popup/overlay — taking over the
 * full row of the 2-column grid while open, same disclosure pattern as the
 * reference "+Add VA" card, just triggered from an icon here.
 */
export function NewPlayerButton({
  sessions,
  defaultSessionId,
}: {
  sessions: SessionOption[];
  defaultSessionId: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex flex-col items-center gap-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-full btn-brand text-white transition-transform hover:scale-105">
          <IconUserPlus className="h-4 w-4" />
        </span>
        <span className="text-[10px] leading-tight text-black/60">New player</span>
      </button>
    );
  }

  return (
    <div className="col-span-2 rounded-lg border border-black/10 bg-black/[0.02] p-3 text-left">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-brand">New player</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-medium text-black/50 hover:text-brand"
        >
          Cancel
        </button>
      </div>

      <form action={createPlayer} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-brand">Session date</label>
          <select
            name="session_id"
            defaultValue={defaultSessionId}
            required
            className="w-full rounded border border-black/15 bg-white px-2 py-1.5 text-sm"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.session_date).toLocaleDateString("en-US")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-brand">Name</label>
          <input
            type="text"
            name="name"
            required
            autoFocus
            placeholder="Full name"
            className="w-full rounded border border-black/15 bg-white px-2 py-1.5 text-sm"
          />
        </div>

        <div className="flex justify-end">
          <SubmitButton
            className="rounded btn-brand px-3 py-1.5 text-xs font-medium text-white"
            pendingLabel="Adding…"
          >
            Add player
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
