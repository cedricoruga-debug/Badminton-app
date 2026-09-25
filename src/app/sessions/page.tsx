import Link from "next/link";
import { AddPlayerButton } from "@/app/components/AddPlayerButton";
import { EditSessionButton } from "@/app/components/EditSessionButton";
import { PlayerSessionRow } from "@/app/components/PlayerSessionRow";
import { getAllSessions, getGames, getPlayerSessions } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * Sessions view: two panels — dates (left) and the selected session's
 * breakdown with its players stacked below (right) — each scrolling on
 * its own. Which date is selected lives in the URL (?session=id), so
 * it's just links.
 */
export default async function SessionsPage(props: PageProps<"/sessions">) {
  const searchParams = await props.searchParams;
  const requestedSession = typeof searchParams.session === "string" ? searchParams.session : undefined;

  const sessions = await getAllSessions();

  const selectedSessionId =
    requestedSession && sessions.some((s) => s.id === requestedSession) ? requestedSession : sessions[0]?.id;

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const [selectedPlayers, selectedGames] = selectedSessionId
    ? await Promise.all([getPlayerSessions(selectedSessionId), getGames(selectedSessionId)])
    : [[], []];

  // Total collected: sum of payable for players who have actually paid
  // (payment_method set). Total earning: the built-in margin baked into
  // the payable formula — CEILING((court_share + shuttle_share) + 10, 10)
  // — i.e. payable minus the raw court+shuttle cost, per player — but only
  // counted for players who have actually paid; an unpaid player's margin
  // isn't earned yet.
  const paidPlayers = selectedPlayers.filter((ps) => ps.payment_method !== null);
  const totalCollected = paidPlayers.reduce((sum, ps) => sum + ps.payable, 0);
  const collectedGcash = selectedPlayers
    .filter((ps) => ps.payment_method === "Gcash")
    .reduce((sum, ps) => sum + ps.payable, 0);
  const collectedCash = selectedPlayers
    .filter((ps) => ps.payment_method === "Cash")
    .reduce((sum, ps) => sum + ps.payable, 0);
  const totalEarning = paidPlayers.reduce(
    (sum, ps) => sum + (ps.payable - ps.court_share - ps.shuttle_share),
    0
  );

  return (
    <div className="flex flex-col p-4 landscape:h-[calc(100vh-60px)] landscape:overflow-hidden">
      <Breadcrumb current="Sessions" />

      {sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-black/40">No sessions yet.</p>
      ) : (
        <div className="flex flex-col gap-4 landscape:min-h-0 landscape:flex-1 landscape:flex-row landscape:items-stretch">
          {/* Dates panel — header fixed, only the date list scrolls */}
          <section className="flex w-full flex-none flex-col overflow-hidden rounded-xl bg-white p-3 shadow-soft landscape:w-56">
            <h3 className="mb-2 flex-none px-1 text-xs font-semibold uppercase tracking-wide text-black/40">
              Dates
            </h3>
            <ul className="max-h-48 space-y-1 overflow-x-hidden overflow-y-auto landscape:min-h-0 landscape:max-h-none landscape:flex-1">
              {sessions.map((s) => {
                const active = s.id === selectedSessionId;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/sessions?session=${s.id}`}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                        active ? "bg-brand font-medium text-white" : "text-black/70 hover:bg-black/5"
                      }`}
                    >
                      <span>{new Date(s.session_date).toLocaleDateString("en-US")}</span>
                      <span className={active ? "text-white/70" : "text-black/30"}>
                        {s.total_players > 0 && s.paid_count === s.total_players
                          ? `₱${s.total_earning.toFixed(0)}`
                          : `${s.paid_count}/${s.total_players} paid`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Selected session's breakdown (fixed) with its players below (scrolls on its own) */}
          <section className="flex min-w-0 flex-col overflow-hidden rounded-xl bg-white p-4 shadow-soft landscape:flex-1">
            <div className="flex-none">
              <div className="mb-2 flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-black/40">Details</h3>
                {selectedSession && <EditSessionButton session={selectedSession} />}
              </div>
              {selectedSession && (
                <dl className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm landscape:grid-cols-3 landscape:gap-x-8">
                  <Stat label="Hours" value={selectedSession.hours} />
                  <Stat label="Fee / hour" value={`₱${selectedSession.fee_per_hour.toFixed(2)}`} />
                  <Stat label="Court fee" value={`₱${selectedSession.court_fee.toFixed(2)}`} />
                  <Stat label="Shuttle tube cost" value={`₱${selectedSession.shuttle_tube_cost.toFixed(2)}`} />
                  <Stat label="Cost / shuttle" value={`₱${selectedSession.cost_per_shuttle.toFixed(2)}`} />
                  <Stat label="Shuttle fee / game" value={`₱${selectedSession.shuttle_fee_per_game.toFixed(2)}`} />
                  <Stat label="Players" value={selectedSession.player_count} />
                  <Stat
                    label="Court share / player"
                    value={`₱${selectedSession.court_share_per_player.toFixed(2)}`}
                  />
                </dl>
              )}
              {selectedSession && (
                <dl className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-black/10 pt-3 text-sm landscape:grid-cols-3 landscape:gap-x-8">
                  <Stat
                    label="Paid players"
                    value={`${paidPlayers.length}/${selectedPlayers.length}`}
                    emphasize
                  />
                  <Stat
                    label="Total payable"
                    value={`₱${selectedSession.total_payable.toFixed(2)}`}
                    emphasize
                  />
                  <Stat label="Total collected" value={`₱${totalCollected.toFixed(2)}`} emphasize />
                  <Stat label="Total earning" value={`₱${totalEarning.toFixed(2)}`} emphasize />
                  <Stat
                    label="Collected via GCash"
                    value={`₱${collectedGcash.toFixed(2)}`}
                    emphasize
                    color="blue"
                  />
                  <Stat
                    label="Collected via Cash"
                    value={`₱${collectedCash.toFixed(2)}`}
                    emphasize
                    color="green"
                  />
                </dl>
              )}
            </div>

            <div className="flex flex-col landscape:min-h-0 landscape:flex-1">
              <div className="mb-2 flex flex-none items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-black/40">Players</h3>
                {selectedSessionId && <AddPlayerButton sessionId={selectedSessionId} />}
              </div>
              <ul className="overflow-x-hidden landscape:min-h-0 landscape:flex-1 landscape:overflow-y-auto">
                {selectedPlayers.length === 0 ? (
                  <li className="py-4 text-sm text-black/50">No players registered for this date.</li>
                ) : (
                  selectedPlayers.map((ps) => (
                    <PlayerSessionRow key={ps.id} ps={ps} games={selectedGames} />
                  ))
                )}
              </ul>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  emphasize = false,
  color = "brand",
}: {
  label: string;
  value: string | number;
  emphasize?: boolean;
  color?: "brand" | "blue" | "green";
}) {
  const emphasizeColor =
    color === "blue" ? "text-blue-700" : color === "green" ? "text-green-700" : "text-brand";
  return (
    <div>
      <dt className="text-black/50">{label}</dt>
      <dd className={emphasize ? `text-base font-semibold ${emphasizeColor}` : "font-medium"}>{value}</dd>
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
