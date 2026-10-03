"use client";

import { useEffect, useState } from "react";
import { Ball, BadmintonLines, Paddle, PickleballLines, Racket, Shuttle } from "./art";

type Sport = "badminton" | "pickleball";

/** Sample matchups for the demo queue — illustrative only, not real data. */
const MATCHES: [string, string, string, string][] = [
  ["Ana", "Ben", "Carlo", "Dee"],
  ["Migs", "Joy", "Paolo", "Kat"],
  ["Rico", "Liza", "Sam", "Tin"],
  ["Jas", "Mae", "Bong", "Ria"],
  ["Nico", "Pia", "Leo", "Bea"],
];

const START_SCORE: Record<Sport, [number, number]> = {
  badminton: [14, 12],
  pickleball: [6, 4],
};

/**
 * The hero's live court: a looping rally (shuttle or ball, all CSS
 * keyframes in landing.css), a score bug that ticks once per rally, a demo
 * queue that rolls over when a game ends, and a Badminton/Pickleball
 * toggle that swaps the court, net height, racket/paddle and scoring.
 * Purely decorative to screen readers except the toggle itself.
 */
export function HeroCourt() {
  const [sport, setSport] = useState<Sport>("badminton");
  const [match, setMatch] = useState({ a: START_SCORE.badminton[0], b: START_SCORE.badminton[1], game: 0 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = sport === "pickleball" ? 11 : 21;
    // One point per rally loop (the CSS rally cycle is 2.4s). When a side
    // reaches the target the game ends and the demo queue rolls over.
    const t = setInterval(() => {
      const leftScores = Math.random() < 0.55;
      setMatch((m) => {
        const a = m.a + (leftScores ? 1 : 0);
        const b = m.b + (leftScores ? 0 : 1);
        return a >= target || b >= target ? { a: 0, b: 0, game: m.game + 1 } : { a, b, game: m.game };
      });
    }, 2400);
    return () => clearInterval(t);
  }, [sport]);

  function pick(s: Sport) {
    setSport(s);
    setMatch((m) => ({ a: START_SCORE[s][0], b: START_SCORE[s][1], game: m.game }));
  }

  const score = [match.a, match.b];
  const game = match.game;

  const isPick = sport === "pickleball";
  const now = MATCHES[game % MATCHES.length];
  const next = MATCHES[(game + 1) % MATCHES.length];

  return (
    <div className={`kx-hero-visual kx-rise${isPick ? " kx-pb" : ""}`} style={{ animationDelay: ".25s" }}>
      <div className="kx-toggle-row">
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--kx-muted)" }}>Show me</span>
        <div className="kx-toggle" role="group" aria-label="Choose a sport">
          <button type="button" aria-pressed={!isPick} onClick={() => pick("badminton")}>
            Badminton
          </button>
          <button type="button" aria-pressed={isPick} onClick={() => pick("pickleball")}>
            Pickleball
          </button>
        </div>
      </div>

      <div className="kx-stage" aria-hidden="true">
        <div className="kx-stage-light" />
        <div className="kx-floor">
          <div className="kx-floor-plane">{isPick ? <PickleballLines /> : <BadmintonLines />}</div>
        </div>
        <div className="kx-net" />

        <div className="kx-racket kx-racket-l">
          <div className="kx-swing">{isPick ? <Paddle face="var(--kx-accent)" /> : <Racket grip="var(--kx-accent)" />}</div>
        </div>
        <div className="kx-racket kx-racket-r">
          <div className="kx-swing">{isPick ? <Paddle face="var(--kx-volt)" /> : <Racket grip="var(--kx-volt)" />}</div>
        </div>

        <div className="kx-hit kx-hit-l" />
        <div className="kx-hit kx-hit-r" />

        {isPick ? (
          <>
            <div className="kx-mx" style={{ bottom: 84 }}>
              <div className="kx-shadow kx-shadow-ball" />
            </div>
            <div className="kx-mx" style={{ bottom: 206 }}>
              <div className="kx-by">
                <div className="kx-spin" style={{ width: 0, height: 0 }}>
                  <Ball className="kx-ball" />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="kx-mx" style={{ bottom: 90 }}>
              <div className="kx-shadow" />
            </div>
            <div className="kx-mx" style={{ bottom: 236 }}>
              <div className="kx-my">
                <div className="kx-face">
                  <div className="kx-tilt">
                    <Shuttle className="kx-shuttle" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="kx-scorebug">
          <span className="kx-live">
            <span className="kx-dot" />
            LIVE
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--kx-soft)" }}>Game {game + 4}</span>
          <span className="kx-mono" style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>
            {score[0]}
            <span style={{ color: "#5F7A6E" }}> – </span>
            {score[1]}
          </span>
          <span className="kx-hide-sm" style={{ fontSize: 12, fontWeight: 600, color: "var(--kx-faint)" }}>
            {isPick ? "Game to 11" : "Rally to 21"}
          </span>
        </div>

        <div className="kx-toast kx-hide-sm">
          <div className="kx-toast-inner">
            <span className="kx-toast-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 003.4 0" />
              </svg>
            </span>
            <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{next[0]}, you&apos;re up next</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>Head to Court 2</span>
            </span>
          </div>
        </div>
      </div>

      <div className="kx-strip" aria-label="Sample live queue">
        <div>
          <span className="kx-strip-label" style={{ color: "#0E6B4A" }}>
            Now playing
          </span>
          <span className="kx-strip-main">
            {now[0]} &amp; {now[1]}
          </span>
          <span className="kx-strip-sub">
            vs {now[2]} &amp; {now[3]}
          </span>
        </div>
        <div>
          <span className="kx-strip-label" style={{ color: "#7A5E00" }}>
            Up next
          </span>
          <span className="kx-strip-main">
            {next[0]} &amp; {next[1]}
          </span>
          <span className="kx-strip-sub">
            vs {next[2]} &amp; {next[3]}
          </span>
        </div>
        <div className="kx-strip-pay">
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span className="kx-strip-label">Your share</span>
            <span className="kx-mono" style={{ fontSize: 26, fontWeight: 700 }}>
              ₱175
            </span>
          </span>
          <span className="kx-gcash-chip">Pay with GCash</span>
        </div>
      </div>
    </div>
  );
}
