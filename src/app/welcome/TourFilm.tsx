"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BadmintonLines, Crown, QrArt } from "./art";

const CHAPTERS = [
  { n: "01", t: "Open a session", d: "Court fee, price per game, roster — done." },
  { n: "02", t: "Line up the games", d: "Requested → Queued → Ongoing → Done." },
  { n: "03", t: "Crown the winners", d: "Tap a side. The leaderboard updates itself." },
  { n: "04", t: "Everyone pays fair", d: "Shares worked out. GCash or cash, marked." },
];

const SCENE_MS = 4800;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}
const TICK_MS = 120;

/**
 * "The 20-second tour": a four-chapter motion-graphics film of a game night,
 * built from markup + CSS keyframes rather than a video file (instant load,
 * crisp on any screen, nothing to host). Autoplays and loops; the play/pause
 * button and chapter buttons give the visitor control. Each scene is keyed
 * so its entrance animations restart every time it comes back around.
 * Starts paused for visitors who prefer reduced motion.
 */
export function TourFilm() {
  const [{ scene, progress }, setPos] = useState({ scene: 0, progress: 0 });
  // null = the visitor hasn't pressed play/pause yet, so follow their
  // reduced-motion preference (paused if they asked for less motion).
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);
  const playing = userPlaying ?? !reducedMotion;

  useEffect(() => {
    if (!playing) return;
    const step = (TICK_MS / SCENE_MS) * 100;
    const t = setInterval(() => {
      setPos((pos) =>
        pos.progress + step >= 100
          ? { scene: (pos.scene + 1) % CHAPTERS.length, progress: 0 }
          : { scene: pos.scene, progress: pos.progress + step }
      );
    }, TICK_MS);
    return () => clearInterval(t);
  }, [playing]);

  return (
    <div className="kx-film kx-reveal">
      <div className="kx-screen" aria-hidden="true">
        <div className="kx-screen-title">
          <span className="kx-d kx-volt" style={{ fontSize: 64, lineHeight: 1 }}>
            {CHAPTERS[scene].n}
          </span>
          <span className="kx-d" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>
            {CHAPTERS[scene].t}
          </span>
        </div>
        {scene === 0 && <SceneSession key="s0" />}
        {scene === 1 && <SceneQueue key="s1" />}
        {scene === 2 && <SceneWinners key="s2" />}
        {scene === 3 && <ScenePay key="s3" />}
      </div>

      <div className="kx-controls">
        <button
          type="button"
          className="kx-play"
          onClick={() => setUserPlaying(!playing)}
          aria-label={playing ? "Pause the tour" : "Play the tour"}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 4l13 8-13 8z" />
            </svg>
          )}
        </button>
        <div className="kx-chapters">
          {CHAPTERS.map((c, i) => (
            <button
              key={c.n}
              type="button"
              className="kx-chapter"
              aria-current={i === scene ? "step" : undefined}
              onClick={() => setPos({ scene: i, progress: 0 })}
            >
              <span className="kx-progress">
                <span style={{ width: `${i < scene ? 100 : i === scene ? progress : 0}%` }} />
              </span>
              <span style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                <span className="kx-mono" style={{ fontSize: 12, color: "var(--kx-faint)" }}>
                  {c.n}
                </span>
                <span style={{ fontSize: 15, fontWeight: 800 }}>{c.t}</span>
              </span>
              <span className="kx-chapter-desc" style={{ display: "block", marginTop: 4, fontSize: 13, color: "var(--kx-muted)", lineHeight: 1.4 }}>
                {c.d}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const ROSTER = ["Ana", "Ben", "Carlo", "Dee", "Migs", "Joy", "Paolo", "Kat", "Rico", "Liza", "Sam"];

function SceneSession() {
  return (
    <div className="kx-scene">
      <div className="kx-paper kx-pop" style={{ width: 300, padding: 22, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>New session</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#0E6B4A", background: "#D7F3E6", padding: "4px 10px", borderRadius: 99 }}>
            Saturday
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="kx-field-label">Court fee</span>
          <div className="kx-field kx-field-on">
            <span className="kx-mono kx-type">₱1,200</span>
            <span className="kx-caret">|</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span className="kx-field-label">Price per game</span>
          <div className="kx-field">
            <span className="kx-mono kx-type" style={{ animationDelay: "1.5s" }}>
              ₱25
            </span>
          </div>
        </div>
        <span className="kx-pop" style={{ fontSize: 13, fontWeight: 700, color: "#0E6B4A", animationDelay: "2.4s" }}>
          Court fee split across 12 players
        </span>
      </div>
      <div style={{ maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "var(--kx-muted)", letterSpacing: ".1em", textTransform: "uppercase" }}>
          Roster · bulk add
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ROSTER.map((name, i) => (
            <span key={name} className="kx-chip kx-pop" style={{ animationDelay: `${0.6 + i * 0.12}s` }}>
              {name}
            </span>
          ))}
          <span
            className="kx-chip kx-pop"
            style={{ animationDelay: "1.92s", background: "var(--kx-accent)", color: "var(--kx-accent-ink)", fontWeight: 800 }}
          >
            + Tin
          </span>
        </div>
      </div>
    </div>
  );
}

function SceneQueue() {
  const cols = [
    { h: "Requested", a: "Nico & Pia", b: "vs Leo & Bea" },
    { h: "Queued", a: "Rico & Liza", b: "vs Sam & Tin" },
    { h: "Ongoing", a: "Ana & Ben", b: "vs Carlo & Dee", live: true },
    { h: "Done", a: "Jas & Mae · 21", b: "vs Bong & Ria · 18", done: true },
  ];
  return (
    <div className="kx-scene">
      <div className="kx-scene-wide" style={{ position: "relative", width: "100%", maxWidth: 920 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }}>
          {cols.map((c) => (
            <div key={c.h} className="kx-qcol">
              <span
                className="kx-qcol-head"
                style={c.live ? { color: "var(--kx-volt)" } : c.done ? { color: "var(--kx-accent)" } : undefined}
              >
                {c.h}
              </span>
              <div className="kx-qcard" style={c.live ? { borderColor: "var(--kx-volt)" } : undefined}>
                {c.a}
                <span>{c.b}</span>
              </div>
              <div className="kx-qslot" />
            </div>
          ))}
        </div>
        <div className="kx-qcard kx-qmover">
          Migs &amp; Joy
          <span>vs Paolo &amp; Kat</span>
        </div>
      </div>
    </div>
  );
}

function SceneWinners() {
  const board = [
    { name: "Ana", w: "5W", pct: 100, volt: true },
    { name: "Migs", w: "4W", pct: 80 },
    { name: "Kat", w: "3W", pct: 60 },
  ];
  return (
    <div className="kx-scene">
      <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", maxWidth: "100%" }}>
        <div className="kx-mono" style={{ fontSize: "clamp(18px, 3vw, 28px)", fontWeight: 700, textAlign: "center" }}>
          Ana &amp; Ben <span className="kx-volt">21</span> <span style={{ color: "#5F7A6E" }}>–</span> 17 Carlo &amp; Dee
        </div>
        <div
          style={{
            position: "relative",
            width: 480,
            maxWidth: "100%",
            aspectRatio: "1340 / 610",
            borderRadius: 10,
            background: "var(--kx-court)",
            overflow: "hidden",
          }}
        >
          <BadmintonLines className="kx-court-svg" stroke={8} />
          <span className="kx-ripple" style={{ left: "25%", top: "50%", width: 120, height: 120, borderWidth: 4 }} />
          <span className="kx-ripple" style={{ left: "25%", top: "50%", width: 120, height: 120, borderWidth: 4, animationDelay: ".8s" }} />
          <div style={{ position: "absolute", left: "25%", top: "50%", transform: "translate(-50%, -50%)" }}>
            <div
              className="kx-pop"
              style={{
                animationDelay: "1s",
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                borderRadius: 99,
                background: "var(--kx-volt)",
                color: "var(--kx-volt-ink)",
                fontWeight: 900,
                fontSize: 16,
                whiteSpace: "nowrap",
              }}
            >
              <Crown />
              Winners
            </div>
          </div>
        </div>
      </div>
      <div
        className="kx-pop"
        style={{
          width: 260,
          padding: 20,
          borderRadius: 20,
          background: "var(--kx-surface-2)",
          border: "1px solid var(--kx-line)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          animationDelay: "1.6s",
        }}
      >
        <span className="kx-eyebrow" style={{ color: "var(--kx-volt)", fontSize: 12 }}>
          Today&apos;s MVP
        </span>
        {board.map((r, i) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 52, fontWeight: 800 }}>{r.name}</span>
            <span style={{ flex: 1, height: 12, borderRadius: 9, background: "#0A1814" }}>
              <span
                className="kx-growx"
                style={{
                  display: "block",
                  width: `${r.pct}%`,
                  height: "100%",
                  borderRadius: 9,
                  background: r.volt ? "var(--kx-volt)" : "var(--kx-accent)",
                  animationDelay: `${1.9 + i * 0.1}s`,
                }}
              />
            </span>
            <span className="kx-mono" style={{ fontSize: 13 }}>
              {r.w}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScenePay() {
  const rows = [
    { name: "Ana", games: 3, amt: "₱175", stamp: "GCASH", color: "var(--kx-gcash)", delay: ".6s" },
    { name: "Ben", games: 4, amt: "₱200", stamp: "CASH", color: "#0E6B4A", delay: "1.2s" },
    { name: "Carlo", games: 2, amt: "₱150", stamp: "GCASH", color: "var(--kx-gcash)", delay: "1.8s" },
    { name: "Dee", games: 3, amt: "₱175" },
  ];
  return (
    <div className="kx-scene">
      <div className="kx-paper" style={{ width: 420, maxWidth: "100%", padding: "6px 20px" }}>
        {rows.map((r) => (
          <div key={r.name} className="kx-payrow">
            <span style={{ flex: 1, fontWeight: 800 }}>{r.name}</span>
            <span style={{ fontSize: 13, color: "#4A5D55", fontWeight: 600 }}>{r.games} games</span>
            <span className="kx-mono" style={{ width: 64, textAlign: "right", fontWeight: 700 }}>
              {r.amt}
            </span>
            {r.stamp ? (
              <span className="kx-stamp" style={{ color: r.color, animationDelay: r.delay }}>
                {r.stamp}
              </span>
            ) : (
              <span style={{ width: 74, textAlign: "center", fontSize: 12, fontWeight: 800, color: "#7A5E00" }}>Owes</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div className="kx-qr" style={{ width: 190, height: 190, padding: 14, borderRadius: 20 }}>
          <QrArt size={162} />
          <span className="kx-scan" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span className="kx-eyebrow" style={{ color: "var(--kx-muted)", fontSize: 12 }}>
            Collected so far
          </span>
          <span className="kx-mono kx-volt kx-pop" style={{ fontSize: 34, fontWeight: 700, animationDelay: "2s" }}>
            ₱525
          </span>
        </div>
      </div>
    </div>
  );
}
