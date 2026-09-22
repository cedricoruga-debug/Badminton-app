"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconShuttle } from "@/app/components/icons";

type QueueGame = {
  gameNumber: number;
  status: "Queued" | "Ongoing";
  /** [player1, player2, player3, player4] — team1 is the first pair, team2
   * the second, same split as CourtBox. A name is null for an under-filled
   * game (rare, but a game can be logged with fewer than 4 players). */
  players: [string | null, string | null, string | null, string | null];
};

type QueueRow = {
  game_number: number;
  status: string;
  player1_name: string | null;
  player2_name: string | null;
  player3_name: string | null;
  player4_name: string | null;
};

/** How often to silently re-fetch the queue while this page is open — often
 * enough that "who's next" stays useful, not so often it's hammering the
 * database for what's really just a handful of concurrent viewers at most. */
const POLL_MS = 8000;

/**
 * The public queue-viewing page — no login, reachable by anyone with the
 * link (see PUBLIC_PATHS in proxy.ts). A player enters the session's
 * 6-digit code (told to them in person, or scanned off the QR on the
 * dashboard — see JoinQrSection, which links here with ?code=… pre-filled)
 * and sees a live, read-only view of who's playing now and who's up next.
 * That's the whole feature: nothing here registers anyone or needs the
 * queue master's approval — an earlier version did (a two-step "request to
 * join, queue master approves"), but a visitor here only ever wanted to
 * check the queue, so that approval step was just friction for no reason.
 * Players are still added to a session by the queue master themselves
 * (NewPlayerButton's single/bulk add), same as before this page existed.
 *
 * Talks straight to Supabase from the browser (find_session_by_join_code,
 * get_queue_by_code — both security-definer functions granted to `anon`;
 * see schema.sql) rather than through a server action, so polling for live
 * updates below is just a repeated client call, no extra plumbing.
 */
export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<string | null>(null);
  const [games, setGames] = useState<QueueGame[] | null>(null);
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabaseRef = useRef(createClient());

  async function loadQueue(c: string, opts: { silent?: boolean } = {}) {
    const supabase = supabaseRef.current;

    const { data: matches, error: lookupError } = await supabase.rpc("find_session_by_join_code", {
      code: c,
    });
    const session = matches?.[0];
    if (lookupError || !session) {
      if (!opts.silent) {
        setError(
          lookupError?.message ??
            "That code doesn't match an open session — double-check it with the queue master."
        );
      }
      return;
    }

    const { data: rows, error: queueError } = await supabase.rpc("get_queue_by_code", { code: c });
    if (queueError) {
      if (!opts.silent) setError(queueError.message);
      return;
    }

    setSessionDate(session.session_date as string);
    setGames(
      ((rows as QueueRow[] | null) ?? []).map((r) => ({
        gameNumber: r.game_number,
        status: r.status as "Queued" | "Ongoing",
        players: [r.player1_name, r.player2_name, r.player3_name, r.player4_name],
      }))
    );
    setError(null);
    setConfirmedCode(c);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code.");
      return;
    }
    startTransition(() => loadQueue(trimmed));
  }

  function changeCode() {
    setConfirmedCode(null);
    setGames(null);
    setSessionDate(null);
    setError(null);
  }

  // Keeps the queue live while it's on screen — no realtime subscription
  // here, since an anonymous visitor has no RLS read access to `games` for
  // that to work against (see AppChrome's useLiveRefresh, which skips this
  // page for the same reason). A plain interval is the simple stand-in.
  useEffect(() => {
    if (!confirmedCode) return;
    const interval = setInterval(() => loadQueue(confirmedCode, { silent: true }), POLL_MS);
    return () => clearInterval(interval);
  }, [confirmedCode]);

  if (confirmedCode && games) {
    return <QueueView sessionDate={sessionDate} games={games} onChangeCode={changeCode} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black/[0.02] p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-soft">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-full btn-brand text-white">
            <IconShuttle className="h-6 w-6" />
          </span>
          <h1 className="text-lg font-semibold">View the queue</h1>
          <p className="text-center text-sm text-black/50">
            Enter the code the queue master gave you to see who&apos;s playing and who&apos;s up next.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand">Session code</label>
            <input
              type="text"
              inputMode="numeric"
              required
              autoFocus
              maxLength={6}
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded border border-black/15 px-3 py-2 text-center text-lg tracking-[0.3em]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded btn-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Loading…" : "View queue"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** The live, read-only queue itself — "Now playing" (Ongoing games, each
 * shown as team vs. team) then "Up next" (Queued games, in order). Pure
 * viewing: no controls, nothing tappable except "Change code". */
function QueueView({
  sessionDate,
  games,
  onChangeCode,
}: {
  sessionDate: string | null;
  games: QueueGame[];
  onChangeCode: () => void;
}) {
  const ongoing = games.filter((g) => g.status === "Ongoing");
  const queued = games.filter((g) => g.status === "Queued");

  return (
    <div className="min-h-screen bg-black/[0.02] p-4">
      <div className="mx-auto w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full btn-brand text-white">
              <IconShuttle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-black/40">Live queue</p>
              <p className="text-sm font-medium">
                {sessionDate
                  ? new Date(sessionDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onChangeCode} className="text-xs font-medium text-brand hover:underline">
            Change code
          </button>
        </div>

        <section className="rounded-xl bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-black/40">Now playing</h2>
          {ongoing.length === 0 ? (
            <p className="py-4 text-center text-sm text-black/40">No games on court right now.</p>
          ) : (
            <ul className="space-y-2">
              {ongoing.map((g) => (
                <li key={g.gameNumber} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                  <span className="mr-2 flex-none font-medium text-black/40">G{g.gameNumber}</span>
                  <Matchup players={g.players} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-black/40">Up next</h2>
          {queued.length === 0 ? (
            <p className="py-4 text-center text-sm text-black/40">Queue&apos;s empty right now.</p>
          ) : (
            <ol className="space-y-2">
              {queued.map((g) => (
                <li key={g.gameNumber} className="rounded-lg bg-black/[0.03] px-3 py-2 text-sm">
                  <span className="mr-2 flex-none font-medium text-black/40">G{g.gameNumber}</span>
                  <Matchup players={g.players} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

/** "Ced & Weng  vs  Tey & Ron" — a blank slot (game logged with fewer than
 * 4 players) just drops out of its side rather than showing a placeholder. */
function Matchup({ players }: { players: [string | null, string | null, string | null, string | null] }) {
  const team1 = players.slice(0, 2).filter(Boolean).join(" & ") || "—";
  const team2 = players.slice(2, 4).filter(Boolean).join(" & ") || "—";
  return (
    <span className="font-medium">
      {team1} <span className="font-normal text-black/40">vs</span> {team2}
    </span>
  );
}
