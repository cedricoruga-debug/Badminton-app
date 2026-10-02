"use client";

import { useEffect, useRef, useState } from "react";
import type { createClient } from "@/lib/supabase/client";

type SupabaseBrowserClient = ReturnType<typeof createClient>;

export type AlertGame = {
  gameNumber: number;
  status: "Requested" | "Queued" | "Ongoing";
  players: (string | null)[];
};

const MY_NAME_KEY = "kro5-my-player-name";

function readMyName(): string {
  try {
    return window.localStorage.getItem(MY_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveMyName(name: string) {
  try {
    if (name) window.localStorage.setItem(MY_NAME_KEY, name);
    else window.localStorage.removeItem(MY_NAME_KEY);
  } catch {
    // storage blocked — the pick just won't survive a reload
  }
}

type MyStatus =
  | { kind: "none" }
  | { kind: "oncourt"; gameNumber: number }
  | { kind: "next"; gameNumber: number }
  | { kind: "queued"; gameNumber: number; position: number };

const same = (a: string | null, b: string) => !!a && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Where this player stands right now. "Next" means their game is the
 * first one waiting — the one that goes on the moment a court frees up. */
export function myStatus(games: AlertGame[], name: string): MyStatus {
  if (!name) return { kind: "none" };
  const onCourt = games.find((g) => g.status === "Ongoing" && g.players.some((p) => same(p, name)));
  if (onCourt) return { kind: "oncourt", gameNumber: onCourt.gameNumber };
  const queued = games.filter((g) => g.status === "Queued");
  const idx = queued.findIndex((g) => g.players.some((p) => same(p, name)));
  if (idx === 0) return { kind: "next", gameNumber: queued[0].gameNumber };
  if (idx > 0) return { kind: "queued", gameNumber: queued[idx].gameNumber, position: idx + 1 };
  return { kind: "none" };
}

/** Two short beeps through Web Audio (no sound file to load). Browsers only
 * allow audio after the visitor has tapped something on the page — picking
 * your name counts, which is why the AudioContext is created then. */
function beep(ctx: AudioContext | null) {
  if (!ctx) return;
  try {
    void ctx.resume();
    [0, 0.25].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offset + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + offset);
      osc.stop(ctx.currentTime + offset + 0.2);
    });
  } catch {
    // audio not available — the banner and vibration still work
  }
}

/**
 * "You're up next" alerts for players watching the public queue. A player
 * picks their own name once (remembered on this device); from then on the
 * card shows where they stand, and the moment their game becomes next in
 * line — or goes on court — the phone vibrates, beeps, and the tab title
 * changes so they notice even with the page in the background.
 */
export function UpNextAlert({
  code,
  supabase,
  games,
  matchWord,
}: {
  code: string;
  supabase: SupabaseBrowserClient;
  games: AlertGame[];
  matchWord: string;
}) {
  const [roster, setRoster] = useState<string[]>([]);
  // Only ever rendered client-side (after the queue loads), so reading
  // localStorage in the initializer is safe.
  const [name, setName] = useState(() => (typeof window === "undefined" ? "" : readMyName()));
  const [soundOn, setSoundOn] = useState(true);
  const audioRef = useRef<AudioContext | null>(null);
  const lastKindRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc("get_roster_by_code", { code }).then(({ data }: { data: { player_name: string }[] | null }) => {
      if (!cancelled) setRoster((data ?? []).map((r) => r.player_name));
    });
    return () => {
      cancelled = true;
    };
  }, [code, supabase]);

  const status = myStatus(games, name);

  useEffect(() => {
    const kind = status.kind === "none" || status.kind === "queued" ? status.kind : `${status.kind}-${status.gameNumber}`;
    const previous = lastKindRef.current;
    lastKindRef.current = kind;
    // Alert on a *change* into next/on-court — not on first load, and not
    // again on every 8-second refresh while it stays that way.
    if (previous === null || previous === kind) return;
    if (status.kind === "next" || status.kind === "oncourt") {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate([250, 120, 250, 120, 400]);
      if (soundOn) beep(audioRef.current);
    }
  }, [status, soundOn]);

  // Tab title as a background signal.
  useEffect(() => {
    const base = "KRO5 — Live queue";
    document.title =
      status.kind === "next" ? "🔔 You're up next!" : status.kind === "oncourt" ? "🔥 You're on court!" : base;
    return () => {
      document.title = base;
    };
  }, [status.kind]);

  function pick(value: string) {
    setName(value);
    saveMyName(value);
    lastKindRef.current = null; // new person: don't alert for their current state
    if (!audioRef.current && typeof window !== "undefined") {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) audioRef.current = new Ctor();
    }
  }

  const names = Array.from(new Set([...roster, ...(name && !roster.includes(name) ? [name] : [])])).sort((a, b) =>
    a.localeCompare(b)
  );

  const tone =
    status.kind === "oncourt"
      ? "bg-rose-500 text-white"
      : status.kind === "next"
        ? "bg-amber-400 text-amber-950 animate-[pulse_1.6s_ease-in-out_infinite]"
        : "bg-white text-brand-dark";

  return (
    <section className={`rounded-2xl p-4 shadow-soft transition-colors ${tone}`}>
      {!name ? (
        <>
          <p className="text-sm font-bold">Get pinged when it&apos;s your turn</p>
          <p className="mb-2 text-xs opacity-70">Pick your name — your phone buzzes when you&apos;re up next.</p>
          <select
            value=""
            onChange={(e) => pick(e.target.value)}
            className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm text-black"
          >
            <option value="" disabled>
              {names.length ? "I am…" : "Loading names…"}
            </option>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{name}</p>
            <p className="text-lg font-extrabold leading-tight">
              {status.kind === "oncourt"
                ? `You're on court — ${matchWord} ${status.gameNumber}`
                : status.kind === "next"
                  ? "You're up next! Get ready 🏃"
                  : status.kind === "queued"
                    ? `You're #${status.position} in line`
                    : "Not in the queue yet"}
            </p>
            {status.kind === "none" && (
              <p className="text-xs opacity-60">Ask the queue master, or request a {matchWord} below.</p>
            )}
          </div>
          <div className="flex flex-none flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => {
                setSoundOn((v) => !v);
                if (audioRef.current) void audioRef.current.resume();
              }}
              className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-semibold"
              aria-pressed={soundOn}
            >
              {soundOn ? "🔔 Sound on" : "🔕 Sound off"}
            </button>
            <button type="button" onClick={() => pick("")} className="text-[11px] font-semibold underline opacity-70">
              Not you?
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
