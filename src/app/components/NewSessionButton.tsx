"use client";

import { createSession } from "@/app/actions";
import { Modal } from "@/app/components/Modal";
import { IconCalendarPlus } from "@/app/components/icons";

/** Today's date as a local YYYY-MM-DD string (not UTC — toISOString() alone
 * rolls back a day for timezones ahead of UTC, like the Philippines, any
 * time before 8am local). */
function todayLocalISODate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function NewSessionButton() {
  const today = todayLocalISODate();

  return (
    <Modal label="New Session" icon={<IconCalendarPlus className="h-4 w-4" />} title="New Session">
      {(close) => (
        <form action={createSession} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand">Date</label>
            <input
              type="date"
              name="session_date"
              defaultValue={today}
              required
              autoFocus
              className="w-full rounded border border-black/15 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand">Hours</label>
              <input
                type="number"
                name="hours"
                step="0.5"
                min="0"
                className="w-full rounded border border-black/15 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand">Fee / hour</label>
              <input
                type="number"
                name="fee_per_hour"
                step="0.01"
                min="0"
                className="w-full rounded border border-black/15 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-brand">Shuttle tube cost</label>
            <input
              type="number"
              name="shuttle_tube_cost"
              step="0.01"
              min="0"
              className="w-full rounded border border-black/15 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-black/10 pt-4">
            <button
              type="button"
              onClick={close}
              className="rounded px-4 py-2 text-sm font-medium text-black/60 hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Save
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
