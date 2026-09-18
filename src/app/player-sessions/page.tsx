import Link from "next/link";
import { PlayerSessionRow } from "@/app/components/PlayerSessionRow";
import { getAllPlayerSessions, getAllSessions, getGames } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Player Sessions view: same master/detail layout as Games — a left panel
 * of dates (grouping players by the date they played) and a main panel of
 * that date's players. Which date is selected lives in the URL
 * (?session=id), so it's just links, no client state.
 */
export default async function PlayerSessionsPage(props: PageProps<"/player-sessions">) {
  const searchParams = await props.searchParams;
  const requestedSession = typeof searchParams.session === "string" ? searchParams.session : undefined;

  const [sessions, allRows] = await Promise.all([getAllSessions(), getAllPlayerSessions()]);

  const rowCounts = new Map<string, number>();
  for (const r of allRows) {
    rowCounts.set(r.session_id, (rowCounts.get(r.session_id) ?? 0) + 1);
  }

  const selectedSessionId =
    requestedSession && sessions.some((s) => s.id === requestedSession) ? requestedSession : sessions[0]?.id;

  const selectedRows = selectedSessionId ? allRows.filter((r) => r.session_id === selectedSessionId) : [];
  const selectedGames = selectedSessionId ? await getGames(selectedSessionId) : [];

  return (
    <div className="flex flex-col p-4 landscape:h-[calc(100vh-60px)] landscape:overflow-hidden">
      <Breadcrumb current="Player Sessions" />

      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-black/40">No sessions yet.</p>
      ) : (
        <div className="flex flex-col gap-4 landscape:min-h-0 landscape:flex-1 landscape:flex-row landscape:items-stretch">
          {/* Dates panel — header fixed, only the date list scrolls */}
          <section className="flex w-full flex-none flex-col overflow-hidden rounded-xl bg-white p-3 shadow-sm landscape:w-56">
            <h3 className="mb-2 flex-none px-1 text-xs font-semibold uppercase tracking-wide text-black/40">
              Dates
            </h3>
            <ul className="max-h-48 space-y-1 overflow-x-hidden overflow-y-auto landscape:min-h-0 landscape:max-h-none landscape:flex-1">
              {sessions.map((s) => {
                const active = s.id === selectedSessionId;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/player-sessions?session=${s.id}`}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        active ? "bg-brand font-medium text-white" : "text-black/70 hover:bg-black/5"
                      }`}
                    >
                      <span>{new Date(s.session_date).toLocaleDateString("en-US")}</span>
                      <span className={active ? "text-white/70" : "text-black/30"}>
                        {rowCounts.get(s.id) ?? 0}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Players for the selected date — scrolls within its own panel */}
          <section className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-white p-4 shadow-sm landscape:flex-1">
            <div className="overflow-x-hidden landscape:min-h-0 landscape:flex-1 landscape:overflow-y-auto">
              {selectedRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-black/40">No players registered for this date.</p>
              ) : (
                <ul>
                  {selectedRows.map((r) => (
                    <PlayerSessionRow key={r.id} ps={r} games={selectedGames} />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Breadcrumb({ current }: { current: string }) {
  return (
    <div className="mb-4 flex flex-none items-center gap-2 text-sm text-black/50">
      <Link href="/" className="hover:text-brand">
        Home
      </Link>
      <span>›</span>
      <span className="text-black/80">{current}</span>
    </div>
  );
}
