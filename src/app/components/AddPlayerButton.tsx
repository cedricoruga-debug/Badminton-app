"use client";

import { createPlayer } from "@/app/actions";
import { Modal } from "@/app/components/Modal";
import { SubmitButton } from "@/app/components/SubmitButton";
import { IconUserPlus } from "@/app/components/icons";

/** Small "+" button that opens a popup to register a new player for the
 * session you're currently viewing — lets you add someone without leaving
 * the Sessions page. After saving, it redirects back to this same date. */
export function AddPlayerButton({ sessionId }: { sessionId: string }) {
  return (
    <Modal
      label="Add player"
      icon={null}
      title="New Player"
      size="sm"
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          title="Add player to this session"
          aria-label="Add player to this session"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-brand-light text-brand transition-colors hover:bg-brand hover:text-white"
        >
          <IconUserPlus className="h-3.5 w-3.5" />
        </button>
      )}
    >
      {(close) => (
        <form action={createPlayer} className="space-y-4">
          <input type="hidden" name="session_id" value={sessionId} />
          <input type="hidden" name="redirect_to" value={`/sessions?session=${sessionId}`} />

          <div>
            <label className="mb-1 block text-sm font-medium text-brand">Name</label>
            <input
              type="text"
              name="name"
              required
              autoFocus
              placeholder="Full name"
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
            <SubmitButton
              className="rounded bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
              pendingLabel="Adding…"
            >
              Add player
            </SubmitButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
