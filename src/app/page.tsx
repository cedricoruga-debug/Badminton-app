import { DashboardClient, type DashboardSeed } from "@/app/components/DashboardClient";
import { SetupRequired } from "@/app/setup-required";
import { getAllSessions, getAppSettings, getGames, getLatestSession, getPlayerSessions } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Thin Server Component shell — everything the dashboard actually renders
 * (and every number derived from this data) lives in DashboardClient now,
 * so it can be re-run identically whether the data came from this fresh
 * fetch or, offline, from the IndexedDB cache (see DashboardClient.tsx and
 * src/lib/localCache.ts). This component's only job is: fetch, and hand
 * the result over with a timestamp so DashboardClient can tell a live
 * response from a stale one replayed by the service worker.
 *
 * Fewer queries than this page used to run — getSessionGameCount,
 * getUnpaidPlayerSessions and getQueuedGames were each just a filtered
 * view of getGames/getPlayerSessions's results, so DashboardClient derives
 * them client-side instead of fetching them separately (both sources need
 * to compute them the same way regardless, per its own comment).
 */
export default async function Home() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <SetupRequired />;
  }

  const settings = await getAppSettings();
  const session = await getLatestSession();
  const sessions = await getAllSessions();
  const [sessionPlayers, games] = session
    ? await Promise.all([getPlayerSessions(session.id), getGames(session.id)])
    : [[], []];

  const seed: DashboardSeed = {
    settings,
    session,
    sessions,
    sessionPlayers,
    games,
    fetchedAt: new Date().toISOString(),
  };

  return <DashboardClient seed={seed} />;
}
