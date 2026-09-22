import { NextResponse } from "next/server";

/**
 * Trivial connectivity check for the offline banner (see
 * src/lib/offlineQueue.ts) — `navigator.onLine` only reflects whether the
 * device has a network interface up, not whether it can actually reach
 * this app (e.g. connected to wifi with no internet, or the wifi router
 * itself down but the phone still "online" over a dead LAN). Hitting this
 * route and getting a real response is a much more honest signal. Kept as
 * small and cheap as possible since it's polled periodically while offline.
 */
export function GET() {
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
