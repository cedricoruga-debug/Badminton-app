import Link from "next/link";
import { IconTrophy } from "@/app/components/icons";
import { getAppSettings } from "@/lib/queries";
import { sportCopy } from "@/lib/sport";
import { createClient } from "@/lib/supabase/server";
import { computeLeaderboard, MIN_DECIDED_FOR_RANK, type LeaderboardGame, type PlayerStats } from "./stats";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "session", label: "Latest session" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

/** Every finished game in the club (RLS scopes it), paged past PostgREST's
 * 1,000-row cap so a long history still counts in full. */
async function loadGames(range: RangeKey): Promise<{ games: LeaderboardGame[]; sessionDate: string | null }> {
  const supabase = await createClient();

  let sessionId: string | null = null;
  let sessionDate: string | null = null;
  if (range === "session") {
    const { data } = await supabase
      .from("sessions")
      .select("id, session_date")
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sessionId = data?.id ?? null;
    sessionDate = data?.session_date ?? null;
    if (!sessionId) return { games: [], sessionDate };
  }

  const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const games: LeaderboardGame[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from("games")
      .select("game_date, game_number, winner_team, player1_id, player2_id, player3_id, player4_id")
      .eq("status", "Done")
      .order("game_date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (sessionId) query = query.eq("session_id", sessionId);
    if (range === "30d") query = query.gte("game_date", since);
    const { data, error } = await query;
    if (error) {
      console.error("[leaderboard] Supabase error:", error);
      break;
    }
    games.push(...((data ?? []) as LeaderboardGame[]));
    if (!data || data.length < PAGE) break;
  }
  return { games, sessionDate };
}

async function loadNames(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const names = new Map<string, string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase.from("players").select("id, name").range(from, from + 999);
    for (const p of data ?? []) names.set(p.id, p.name);
    if (!data || data.length < 1000) break;
  }
  return names;
}

function pct(rate: number | null) {
  return rate == null ? "—" : `${Math.round(rate * 100)}%`;
}

export default async function LeaderboardPage(props: PageProps<"/leaderboard">) {
  const searchParams = await props.searchParams;
  const range: RangeKey =
    searchParams.range === "session" || searchParams.range === "30d" ? searchParams.range : "all";

  const [{ games, sessionDate }, names, club] = await Promise.all([loadGames(range), loadNames(), getAppSettings()]);
  const board = computeLeaderboard(games, names);
  const copy = sportCopy(club?.sport);
  const podium = board.filter((p) => p.wins > 0).slice(0, 3);
  const mostGames = [...board].sort((a, b) => b.played - a.played)[0];
  const hottest = [...board].sort((a, b) => b.streak - a.streak)[0];
  const sharpest = board
    .filter((p) => p.wins + p.losses >= MIN_DECIDED_FOR_RANK)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))[0];
  const decidedGames = games.filter((g) => g.winner_team).length;

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-brand-dark">
          <IconTrophy className="h-6 w-6 text-amber-500" />
          Leaderboard
        </h2>
        <nav className="flex gap-1 rounded-full bg-black/5 p-1 text-xs font-semibold">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/leaderboard?range=${r.key}`}
              className={`rounded-full px-3 py-1.5 transition ${
                range === r.key ? "bg-white text-brand shadow-sm" : "text-black/50 hover:text-brand"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <p className="mb-4 text-sm text-black/50">
        {games.length} finished {copy.matchWord}
        {games.length === 1 ? "" : "s"}
        {range === "session" && sessionDate ? ` on ${new Date(sessionDate).toLocaleDateString("en-US")}` : ""}
        {games.length > 0 && ` · ${decidedGames} with a winner recorded`}. Ranked by wins, then win rate.
      </p>

      {board.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-soft">
          <p className="font-semibold text-brand-dark">No finished games yet.</p>
          <p className="mt-1 text-sm text-black/50">
            Tap the winning side on a live court to finish a {copy.matchWord} — wins show up here.
          </p>
        </div>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="mb-4 grid grid-cols-3 items-end gap-2">
              {[podium[1], podium[0], podium[2]].map((p, i) =>
                p ? <PodiumCard key={p.playerId} p={p} place={i === 1 ? 1 : i === 0 ? 2 : 3} /> : <div key={i} />
              )}
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {hottest && hottest.streak >= 2 && (
              <Highlight label="On fire" value={`${hottest.name} · ${hottest.streak} wins in a row`} />
            )}
            {mostGames && <Highlight label="Most games" value={`${mostGames.name} · ${mostGames.played}`} />}
            {sharpest && <Highlight label="Best win rate" value={`${sharpest.name} · ${pct(sharpest.winRate)}`} />}
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-soft">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.03] text-left text-[11px] font-semibold uppercase tracking-wide text-black/40">
                <tr>
                  <th className="w-10 px-3 py-2">#</th>
                  <th className="px-2 py-2">Player</th>
                  <th className="px-2 py-2 text-right">W</th>
                  <th className="px-2 py-2 text-right">L</th>
                  <th className="px-2 py-2 text-right">Win %</th>
                  <th className="hidden px-2 py-2 text-right sm:table-cell">Played</th>
                  <th className="px-3 py-2 text-right">Streak</th>
                </tr>
              </thead>
              <tbody>
                {board.map((p, i) => (
                  <tr key={p.playerId} className="border-t border-black/5">
                    <td className="px-3 py-2 font-semibold text-black/40">{i + 1}</td>
                    <td className="max-w-[9rem] truncate px-2 py-2 font-semibold text-brand-dark">{p.name}</td>
                    <td className="px-2 py-2 text-right font-semibold text-brand">{p.wins}</td>
                    <td className="px-2 py-2 text-right text-black/50">{p.losses}</td>
                    <td className="px-2 py-2 text-right">{pct(p.winRate)}</td>
                    <td className="hidden px-2 py-2 text-right text-black/50 sm:table-cell">{p.played}</td>
                    <td className="px-3 py-2 text-right">
                      {p.streak > 0 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          W{p.streak}
                        </span>
                      ) : p.streak < 0 ? (
                        <span className="text-xs font-semibold text-black/35">L{-p.streak}</span>
                      ) : (
                        <span className="text-black/25">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function PodiumCard({ p, place }: { p: PlayerStats; place: 1 | 2 | 3 }) {
  const style =
    place === 1
      ? "bg-gradient-to-b from-amber-300 to-amber-400 text-amber-950 pb-6 pt-5"
      : place === 2
        ? "bg-gradient-to-b from-slate-200 to-slate-300 text-slate-800 py-4"
        : "bg-gradient-to-b from-orange-200 to-orange-300 text-orange-900 py-3";
  return (
    <div className={`flex flex-col items-center rounded-2xl px-2 text-center shadow-soft ${style}`}>
      <span className="text-2xl font-extrabold">{place}</span>
      <span className="mt-1 w-full truncate text-sm font-bold">{p.name}</span>
      <span className="text-xs font-semibold opacity-75">
        {p.wins} win{p.wins === 1 ? "" : "s"} · {pct(p.winRate)}
      </span>
    </div>
  );
}

function Highlight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-brand-light px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-brand/70">{label}</p>
      <p className="truncate text-sm font-bold text-brand-dark">{value}</p>
    </div>
  );
}
