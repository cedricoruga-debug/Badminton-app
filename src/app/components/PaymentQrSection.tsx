"use client";

import { useState } from "react";

/**
 * The payment QR at the top of the dashboard's QR/Details panel — hidden
 * behind a toggle rather than always on screen. It's only actually needed
 * at the end of a session when everyone's paying up, so leaving it visible
 * the whole time was just a big image taking up space (and sitting exposed
 * on a tablet) for no reason most of the session.
 */
export function PaymentQrSection({ qrUrl }: { qrUrl: string | null }) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="rounded-full border border-brand/30 px-2.5 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-brand-light"
      >
        {show ? "Hide payment QR" : "Show payment QR"}
      </button>

      {show &&
        (qrUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- external, user-uploaded QR image of unknown origin
          <img
            src={qrUrl}
            alt="Payment QR code"
            width={400}
            height={400}
            className="h-auto w-full max-w-[360px] rounded"
          />
        ) : (
          <div className="flex h-[140px] w-full flex-col items-center justify-center gap-1 rounded border border-dashed border-black/15 px-3 text-center text-[11px] text-black/40">
            <p>No payment QR yet.</p>
            <p>Upload one from the Settings icon on the right.</p>
          </div>
        ))}
    </div>
  );
}
