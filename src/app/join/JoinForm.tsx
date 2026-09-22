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
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-full btn-brand text-white shadow-lg shadow-brand/30">
            <IconShuttle className="h-7 w-7" />
          </span>
          <h1 className="text-lg font-semibold">View the queue</h1>
          <p className="text-center text-sm text-black/50">
            Enter the code the queue master gave you to see who&apos;s playing and who&apos;s up next.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand">Session code</label>
            <input
              type="text"
              inputMode="numeric"
              required
              autoFocus
              maxLength={6}
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-xl border border-black/15 px-3 py-3 text-center text-xl tracking-[0.3em] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl btn-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isPending ? "Loading…" : "View queue"}
          </button>
        </form>
      </div>
    </div>
  );
}

/** A small pulsing dot — "this is live, it'll change on its own" — reused
 * for the header's live indicator and the footer note. `dot`/`ping` are the
 * two color classes (a solid dot plus the paler ring animating outward). */
function LiveDot({ dot, ping }: { dot: string; ping: string }) {
  return (
    <span className="relative flex h-1.5 w-1.5 flex-none">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${ping}`} />
      <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dot}`} />
    </span>
  );
}

/** The live, read-only queue itself — "Now playing" (Ongoing games, each
 * shown as a court card) then "Up next" (Queued games, numbered in order).
 * Pure viewing: no controls, nothing tappable except "Change code". Built
 * mobile-first — this is the page most players actually open, usually on
 * their phone while standing courtside — with a branded gradient header
 * (same gradient as the main app's, so a scanning player recognizes it as
 * part of the same thing) rather than the plain utility-page look the code
 * entry screen still uses.
 */
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
    <div className="min-h-screen bg-black/[0.02] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Hero header, full-bleed — matches the main app's header gradient so
       * this reads as the same product, not a bare fallback page. */}
      <div className="bg-gradient-to-r from-brand to-accent px-4 pb-9 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-[0_2px_14px_rgba(236,72,153,0.3)]">
        <div className="mx-auto flex w-full max-w-sm items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white/15">
              <IconShuttle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/75">
                <LiveDot dot="bg-white" ping="bg-white/70" />
                Live queue
              </p>
              <p className="truncate text-base font-semibold">
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
          <button
            type="button"
            onClick={onChangeCode}
            className="flex-none rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25"
          >
            Change code
          </button>
        </div>
      </div>

      {/* Cards overlap the header slightly (negative margin) — a common
       * mobile-hero pattern that makes the page feel like one composed
       * screen instead of a colored banner stacked on plain white. */}
      <div className="mx-auto -mt-5 w-full max-w-sm space-y-3 px-4">
        <section className="rounded-2xl bg-white p-4 shadow-soft">
          <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-black/40">
            <span className="h-2 w-2 flex-none rounded-full bg-rose-500" />
            Now playing
          </h2>
          {ongoing.length === 0 ? (
            <EmptyRow text="No games on court right now." />
          ) : (
            <ul className="space-y-2">
              {ongoing.map((g) => (
                <li key={g.gameNumber} className="rounded-xl border border-rose-100 bg-rose-50/70 px-3.5 py-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-rose-500/80">
                      Game {g.gameNumber}
                    </span>
                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      On court
                    </span>
                  </div>
                  <Matchup players={g.players} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-soft">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-black/40">Up next</h2>
          {queued.length === 0 ? (
            <EmptyRow text="Queue's empty right now." />
          ) : (
            <ol className="space-y-2">
              {queued.map((g, i) => (
                <li key={g.gameNumber} className="flex items-center gap-3 rounded-xl bg-black/[0.03] px-3.5 py-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-white text-[11px] font-bold text-black/40 shadow-sm">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-black/30">
                      Game {g.gameNumber}
                    </p>
                    <Matchup players={g.players} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <p className="flex items-center justify-center gap-1.5 pb-1 pt-2 text-[11px] text-black/30">
          <LiveDot dot="bg-emerald-500" ping="bg-emerald-400/70" />
          Updates automatically
        </p>
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-black/10 text-center text-sm text-black/40">
      {text}
    </div>
  );
}

/** "Ced & Weng  vs  Tey & Ron" — a blank slot (game logged with fewer than
 * 4 players) just drops out of its side rather than showing a placeholder.
 * Both sides get equal room and truncate independently so one long name
 * doesn't push the "vs" badge off a narrow phone screen. */
function Matchup({ players }: { players: [string | null, string | null, string | null, string | null] }) {
  const team1 = players.slice(0, 2).filter(Boolean).join(" & ") || "—";
  const team2 = players.slice(2, 4).filter(Boolean).join(" & ") || "—";
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-black/80">{team1}</span>
      <span className="flex-none rounded-full bg-black/5 px-1.5 py-0.5 text-[9px] font-bold uppercase text-black/40">
        vs
      </span>
      <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-black/80">{team2}</span>
    </div>
  );
}
