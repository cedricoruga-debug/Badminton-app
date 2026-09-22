"use client";

import { useState, useTransition } from "react";
import { QRCodeSVG } from "qrcode.react";
import { backfillSessionJoinCode } from "@/app/actions";

/**
 * The "join by QR" block at the very bottom of the dashboard's QR/Details
 * panel — deliberately styled to echo the payment QR at the top of that
 * same panel (centered, rounded, the same dashed empty-state box for "not
 * set up yet") so the two read as a matching pair, not two unrelated
 * features bolted together.
 *
 * Unlike the payment QR, this one is hidden behind a "Show QR" toggle
 * rather than always visible: the payment QR is something every player
 * glances at all session, but the join QR only matters in the moment a new
 * player is standing there wanting to scan it — no reason to have it
 * on-screen (and scannable by anyone glancing at the tablet) the rest of
 * the time.
 */
export function JoinQrSection({ sessionId, joinCode }: { sessionId: string; joinCode: string | null }) {
  const [isPending, startTransition] = useTransition();

  if (!joinCode) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-black/40">Join by QR</p>
        <div className="flex h-[100px] w-full flex-col items-center justify-center gap-1 rounded border border-dashed border-black/15 px-3 text-center text-[11px] text-black/40">
          <p>No join code yet.</p>
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => backfillSessionJoinCode(sessionId))}
            className="font-medium text-brand hover:underline disabled:opacity-50"
          >
            {isPending ? "Generating…" : "Generate one"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-black/40">Join by QR</p>
      <JoinQrToggle joinCode={joinCode} />
    </div>
  );
}

/** Split out from JoinQrSection so `showQr`'s useState — and thus whether
 * `window.location.origin` ever gets read — stays scoped to just the
 * expand/collapse toggle. It starts false on both server and client, so
 * the QR itself never renders during the initial (server-rendered) pass;
 * by the time a click flips it to true we're fully client-side, so reading
 * `window` here is safe. */
function JoinQrToggle({ joinCode }: { joinCode: string }) {
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join?code=${joinCode}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked — the code is on screen either way.
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="font-mono text-base font-semibold tracking-[0.2em]">{joinCode}</span>
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className="rounded-full border border-brand/30 px-2.5 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-brand-light"
        >
          {showQr ? "Hide QR" : "Show QR"}
        </button>
      </div>

      {showQr && (
        <div className="flex flex-col items-center gap-2 pt-1">
          <div className="flex w-full max-w-[220px] items-center justify-center rounded">
            <QRCodeSVG value={`${window.location.origin}/join?code=${joinCode}`} size={200} className="h-auto w-full" />
          </div>
          <p className="text-center text-[11px] text-black/40">
            Scans straight to the join page with this code filled in.
          </p>
          <button type="button" onClick={copyLink} className="text-[11px] font-medium text-brand hover:underline">
            {copied ? "Link copied ✓" : "Copy link instead"}
          </button>
        </div>
      )}
    </>
  );
}
