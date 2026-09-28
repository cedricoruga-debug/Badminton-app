"use client";

import { useCallback, useEffect, useState, useTransition, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconShuttle } from "@/app/components/icons";
import { LiveDot } from "@/app/components/LiveDot";
import { Matchup } from "@/app/components/Matchup";
import { Modal } from "@/app/components/Modal";

type SupabaseBrowserClient = ReturnType<typeof createClient>;

type QueueGame = {
  gameNumber: number;
  status: "Requested" | "Queued" | "Ongoing";
  /** [player1, player2, player3, player4] — team1 is the first pair, team2
   * the second, same split as CourtBox. A name is null for an under-filled
   * game (rare, but a game can be logged with fewer than 4 players). */
  players: [string | null, string | null, string | null, string | null];
  /** Free-text name from the "Request a set" form — only set on a
   * status: "Requested" row. */
  requestedBy: string | null;
};

type QueueRow = {
  game_number: number;
  status: string;
  player1_name: string | null;
  player2_name: string | null;
  player3_name: string | null;
  player4_name: string | null;
  requested_by: string | null;
};

type RosterPlayer = { id: string; name: string };

/** Remembers the "Your name" field on this device (localStorage) so a
 * player who's requested a set before doesn't have to retype it every
 * time — filled in from here on RequestSetForm's first render, and
 * refreshed on every successful send in case they edit it. Not tied to any
 * player identity, just this browser: a shared/kiosk device would show
 * whoever typed it last, same as the join code itself already does. */
const REQUESTED_BY_STORAGE_KEY = "badminton-requested-by-name";

function readSavedRequestedByName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(REQUESTED_BY_STORAGE_KEY) ?? "";
  } catch {
    return ""; // storage blocked/unavailable — just start blank
  }
}

function saveRequestedByName(name: string) {
  try {
    if (name) window.localStorage.setItem(REQUESTED_BY_STORAGE_KEY, name);
  } catch {
    // storage blocked/full — not worth surfacing an error for a convenience save
  }
}

/** How often to silently re-fetch the queue while this page is open — often
 * enough that "who's next" stays useful, not so often it's hammering the
 * database for what's really just a handful of concurrent viewers at most. */
const POLL_MS = 8000;

/**
 * The public queue-viewing page — no login, reachable by anyone with the
 * link (see PUBLIC_PATHS in proxy.ts). A player enters the session's
 * 6-digit code (told to them in person, or scanned off the QR on the
 * dashboard — see JoinQrSection, which links here with ?code=… pre-filled)
 * and sees a live view of who's playing now, who's up next, and any set
 * they can request themselves (see RequestSetButton below — status
 * "Requested" until the queue master approves or edits it, same as any
 * other queued game from their side). Viewing needs nothing from the queue
 * master; players are still added to a session by the queue master
 * themselves (NewPlayerButton's single/bulk add), same as always — a
 * "Request a set" only proposes who plays a game, not who's on the roster.
 *
 * Talks straight to Supabase from the browser (find_session_by_join_code,
 * get_queue_by_code, get_roster_by_code, request_game — all security-definer
 * functions granted to `anon`; see schema.sql) rather than through a server
 * action, so polling for live updates below is just a repeated client call,
 * no extra plumbing.
 */
export function JoinForm({ initialCode = "" }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState<string | null>(null);
  const [games, setGames] = useState<QueueGame[] | null>(null);
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [supabase] = useState<SupabaseBrowserClient>(() => createClient());

  const loadQueue = useCallback(
    async (c: string, opts: { silent?: boolean } = {}) => {
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
          status: r.status as "Requested" | "Queued" | "Ongoing",
          players: [r.player1_name, r.player2_name, r.player3_name, r.player4_name],
          requestedBy: r.requested_by,
        }))
      );
      setError(null);
      setConfirmedCode(c);
    },
    [supabase]
  );

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
  }, [confirmedCode, loadQueue]);

  if (confirmedCode && games) {
    return (
      <QueueView
        sessionDate={sessionDate}
        games={games}
        code={confirmedCode}
        supabase={supabase}
        onChangeCode={changeCode}
        onRequested={() => loadQueue(confirmedCode, { silent: true })}
      />
    );
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

/** The live queue itself — "Now playing" (Ongoing games, each shown as a
 * court card), "Up next" (Queued games, numbered in order), and "Requested"
 * (submitted via RequestSetButton below, pending the queue master's
 * approval). Built mobile-first — this is the page most players actually
 * open, usually on their phone while standing courtside — with a branded
 * gradient header (same gradient as the main app's, so a scanning player
 * recognizes it as part of the same thing) rather than the plain
 * utility-page look the code entry screen still uses.
 */
function QueueView({
  sessionDate,
  games,
  code,
  supabase,
  onChangeCode,
  onRequested,
}: {
  sessionDate: string | null;
  games: QueueGame[];
  code: string;
  supabase: SupabaseBrowserClient;
  onChangeCode: () => void;
  onRequested: () => void;
}) {
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const ongoing = games.filter((g) => g.status === "Ongoing");
  const queued = games.filter((g) => g.status === "Queued");
  const requested = games.filter((g) => g.status === "Requested");

  return (
    <div className="min-h-screen bg-black/[0.02] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* Hero header, full-bleed — matches the main app's header gradient so
       * this reads as the same product, not a bare fallback page. */}
      <div className="bg-gradient-to-r from-brand to-accent px-4 pb-9 pt-[max(1.25rem,env(safe-area-inset-top))] text-white shadow-[0_2px_14px_rgba(120,148,122,0.3)]">
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
        {confirmation && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800">
            {confirmation}
          </div>
        )}

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
                  <Matchup team1={g.players.slice(0, 2)} team2={g.players.slice(2, 4)} />
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
                    <Matchup team1={g.players.slice(0, 2)} team2={g.players.slice(2, 4)} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Requested sets — only shown once there's at least one, so a
         * session with nothing pending doesn't carry an extra empty-state
         * card around. Pending approval, so styled distinctly (violet)
         * rather than looking like a confirmed spot in the queue. */}
        {requested.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-soft">
            <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-black/40">
              <span className="h-2 w-2 flex-none rounded-full bg-violet-500" />
              Requested — pending approval
            </h2>
            <ul className="space-y-2">
              {requested.map((g) => (
                <li key={g.gameNumber} className="rounded-xl border border-violet-100 bg-violet-50/70 px-3.5 py-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-500/80">
                      Game {g.gameNumber}
                    </span>
                    <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      Pending
                    </span>
                  </div>
                  <Matchup team1={g.players.slice(0, 2)} team2={g.players.slice(2, 4)} />
                  {g.requestedBy && (
                    <p className="mt-1 text-xs text-violet-700">Requested by {g.requestedBy}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <RequestSetButton code={code} supabase={supabase} onSent={() => { setConfirmation("Request sent — waiting for the queue master to approve it."); onRequested(); }} />

        <p className="flex items-center justify-center gap-1.5 pb-1 pt-2 text-[11px] text-black/30">
          <LiveDot dot="bg-emerald-500" ping="bg-emerald-400/70" />
          Updates automatically
        </p>
      </div>
    </div>
  );
}

/** Opens a small modal to pick who's playing and submit it as a
 * status: "Requested" game — the queue master sees it in their own Games
 * Queued list, distinguished by that status, and approves (moves it to
 * Queued) or edits it from there, same as any game they'd logged
 * themselves. */
function RequestSetButton({
  code,
  supabase,
  onSent,
}: {
  code: string;
  supabase: SupabaseBrowserClient;
  onSent: () => void;
}) {
  return (
    <Modal
      label="Request a set"
      icon={null}
      title="Request a set"
      size="sm"
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className="w-full rounded-xl btn-brand px-4 py-3 text-sm font-semibold text-white"
        >
          + Request a set
        </button>
      )}
    >
      {(close) => (
        <RequestSetForm
          code={code}
          supabase={supabase}
          onSent={() => {
            close();
            onSent();
          }}
        />
      )}
    </Modal>
  );
}

function RequestSetForm({
  code,
  supabase,
  onSent,
}: {
  code: string;
  supabase: SupabaseBrowserClient;
  onSent: () => void;
}) {
  const [roster, setRoster] = useState<RosterPlayer[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [requestedByName, setRequestedByName] = useState(readSavedRequestedByName);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();

  useEffect(() => {
    let cancelled = false;
    supabase
      .rpc("get_roster_by_code", { code })
      .then(({ data, error }: { data: { player_id: string; player_name: string }[] | null; error: { message: string } | null }) => {
        if (cancelled) return;
        if (error) {
          setLoadError(error.message);
          return;
        }
        setRoster((data ?? []).map((r) => ({ id: r.player_id, name: r.player_name })));
      });
    return () => {
      cancelled = true;
    };
  }, [code, supabase]);

  function toggle(playerId: string) {
    setSelected((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= 4) return prev;
      return [...prev, playerId];
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (selected.length === 0) {
      setSubmitError("Pick at least one player.");
      return;
    }
    startSubmitting(async () => {
      const trimmedName = requestedByName.trim();
      const { error } = await supabase.rpc("request_game", {
        code,
        player_ids: selected,
        requested_by: trimmedName || null,
      });
      if (error) {
        setSubmitError(error.message);
        return;
      }
      saveRequestedByName(trimmedName);
      onSent();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-black/50">
        Pick up to 4 players — 1st &amp; 2nd play together, then 3rd &amp; 4th. The queue master reviews it
        before it&apos;s added.
      </p>

      {loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : roster === null ? (
        <p className="text-sm text-black/40">Loading players…</p>
      ) : roster.length === 0 ? (
        <p className="text-sm text-black/40">No players registered for this session yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {roster.map((p) => {
            const checked = selected.includes(p.id);
            const disabled = !checked && selected.length >= 4;
            const pickNumber = selected.indexOf(p.id) + 1;
            return (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(p.id)}
                  className="peer sr-only"
                />
                <span
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                    checked
                      ? "cursor-pointer border-transparent bg-brand text-white shadow-sm shadow-brand/30"
                      : disabled
                        ? "cursor-not-allowed border-black/10 bg-black/[0.03] text-black/30"
                        : "cursor-pointer border-black/15 text-black/70 hover:border-brand/40"
                  }`}
                >
                  {checked && (
                    <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-white/25 text-[10px] font-bold">
                      {pickNumber}
                    </span>
                  )}
                  {p.name}
                </span>
              </label>
            );
          })}
        </div>
      )}

      {selected.length > 0 && roster && (
        <div className="rounded-lg bg-black/[0.03] px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-black/40">Matchup</p>
          <Matchup
            team1={selected.slice(0, 2).map((id) => roster.find((p) => p.id === id)?.name)}
            team2={selected.slice(2, 4).map((id) => roster.find((p) => p.id === id)?.name)}
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-brand">Your name (optional)</label>
        <input
          type="text"
          value={requestedByName}
          onChange={(e) => setRequestedByName(e.target.value)}
          placeholder="So the queue master knows who asked"
          className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <button
        type="submit"
        disabled={isSubmitting || selected.length === 0}
        className="w-full rounded-xl btn-brand px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {isSubmitting ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="flex h-16 items-center justify-center rounded-xl border border-dashed border-black/10 text-center text-sm text-black/40">
      {text}
    </div>
  );
}
