"use client";

import { useTransition } from "react";
import { endSession } from "@/app/actions";
import { Modal } from "@/app/components/Modal";
import { IconFlag } from "@/app/components/icons";

/**
 * The dashboard's "End Session" shortcut — replaces "Start Session" while a
 * session is open. Ending is one tap away from a busy court, so it goes
 * through a confirm dialog rather than acting immediately. Once ended, the
 * session's join QR shows a "session ended" screen with the payment QR
 * instead of the live queue; the dashboard itself keeps working (payments
 * can still be recorded) until a new session is started.
 */
export function EndSessionButton({ sessionId }: { sessionId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Modal label="End Session" icon={<IconFlag className="h-4 w-4" />} title="End this session?" size="sm">
      {(close) => (
        <div className="space-y-4">
          <p className="text-sm text-black/70">
            Players who scan the QR will see that the session has ended, along with the payment QR, instead of the
            live queue. You can still record payments here on the dashboard.
          </p>
          <div className="flex justify-end gap-2 border-t border-black/10 pt-4">
            <button
              type="button"
              onClick={close}
              className="rounded px-4 py-2 text-sm font-medium text-black/60 hover:bg-black/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await endSession(sessionId);
                  close();
                })
              }
              className="rounded bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
            >
              {isPending ? "Ending…" : "End session"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
