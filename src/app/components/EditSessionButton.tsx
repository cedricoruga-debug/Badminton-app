"use client";

import { useState, useTransition } from "react";
import { deleteSession, updateSession } from "@/app/actions";
import { Modal } from "@/app/components/Modal";
import { IconEdit } from "@/app/components/icons";
import type { Session } from "@/lib/types";

/** Small pencil icon button that opens an edit popup for the given session
 * (date and cost inputs, plus a "Delete session" option). Used on the
 * Sessions page next to "Details". */
export function EditSessionButton({ session }: { session: Session }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  return (
    <Modal
      label="Edit session"
      icon={null}
      title="Edit Session"
      size="sm"
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          title="Edit session"
          aria-label="Edit session"
          className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-light text-brand transition-colors hover:bg-brand hover:text-white"
        >
          <IconEdit className="h-4 w-4" />
        </button>
      )}
    >
      {(close) => (
        <form action={updateSession} className="space-y-4">
          <input type="hidden" name="session_id" value={session.id} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-brand">Hours</label>
              <input
                type="number"
                name="hours"
                step="0.5"
                min="0"
                defaultValue={session.hours}
                autoFocus
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
                defaultValue={session.fee_per_hour}
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
              defaultValue={session.shuttle_tube_cost}
              className="w-full rounded border border-black/15 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center justify-between border-t border-black/10 pt-4">
            <div>
              {confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-black/50">Delete this session?</span>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() =>
                      startDeleteTransition(async () => {
                        await deleteSession(session.id);
                      })
                    }
                    className="rounded bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
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
                  Delete session
                </button>
              )}
            </div>

            <div className="flex gap-2">
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
                Save changes
              </button>
            </div>
          </div>
        </form>
      )}
    </Modal>
  );
}
