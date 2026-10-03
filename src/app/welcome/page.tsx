import type { Metadata } from "next";
import Link from "next/link";
// Display + scoreboard faces for the marketing page only, self-hosted like
// Nunito (see layout.tsx) so the build never depends on Google's CDN.
import "@fontsource/big-shoulders-display/800";
import "@fontsource/big-shoulders-display/900";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "./landing.css";
import { Arrow, Ball, BadmintonLines, Check, Crown, LogoMark, PickleballLines, QrArt, Shuttle } from "./art";
import { HeroCourt } from "./HeroCourt";
import { TourFilm } from "./TourFilm";

/**
 * The public marketing page. Signed-out visitors see it at "/" (proxy.ts
 * rewrites "/" here), and it's reachable directly at /welcome too. No data
 * fetching — the only client components are the hero's live court and the
 * tour film, both self-contained demos — so it's fast and safe to show
 * anyone.
 *
 * Design: "night court" (landing.css). All motion is CSS keyframes — no
 * video files — so it loads instantly on gym Wi-Fi and switches off for
 * prefers-reduced-motion.
 *
 * Every feature claim below maps to something the app really does (queue +
 * live courts, tap-to-record-winner, automatic fee split, GCash/cash
 * tracking + payment QR, join-by-QR live queue with "request a set" and
 * up-next alerts, leaderboard, offline support). Names and ₱ amounts in the
 * demos are illustrative. If a feature is removed, update the copy here.
 *
 * Any queue master can create their own club from /signup (badminton or
 * pickleball) — that's the main call to action.
 *
 * Optional: set NEXT_PUBLIC_CONTACT_EMAIL to show a "Get KRO5 for your
 * group" contact link in the footer. Left unset, it is simply not rendered.
 */

export const metadata: Metadata = {
  title: "KRO5 — badminton & pickleball queuing for queue masters",
  description:
    "Run your badminton or pickleball night without the chaos. Queue games, track courts live, split fees or charge a flat rate, collect payments, and crown a leaderboard.",
  openGraph: {
    title: "KRO5 — queue smarter, play more",
    description:
      "Fun, simple queuing for badminton and pickleball queue masters and players. Live queue, up-next alerts, automatic fees, easy payments.",
    type: "website",
  },
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function WelcomePage() {
  return (
    <div data-scroll-page className="kx">
      <SiteNav />
      <main>
        <Hero />
        <Marquee />
        <Tour />
        <Stats />
        <Sports />
        <HowItWorks />
        <Features />
        <TwoSides />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ───────────────────────────── Nav ───────────────────────────── */

function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className="kx-logo">
      {!small && (
        <span className="kx-logo-mark">
          <LogoMark />
        </span>
      )}
      <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span className="kx-d" style={{ fontSize: 26, letterSpacing: ".04em" }}>
          KRO5
        </span>
        <span className="kx-logo-sub">Badminton · Pickleball</span>
      </span>
    </span>
  );
}

function SiteNav() {
  return (
    <header className="kx-nav">
      <nav aria-label="Main" className="kx-wrap-wide kx-nav-inner">
        <Link href="/" aria-label="KRO5 home">
          <Logo />
        </Link>
        <div className="kx-nav-links">
          <a className="kx-link" href="#tour">The tour</a>
          <a className="kx-link" href="#sports">Sports</a>
          <a className="kx-link" href="#features">Features</a>
          <a className="kx-link" href="#players">For players</a>
        </div>
        <div className="kx-nav-right">
          <Link className="kx-link kx-hide-sm" href="/join">
            Join a game
          </Link>
          <Link className="kx-link" href="/login">
            Sign in
          </Link>
          <Link className="kx-btn kx-btn-primary" href="/signup">
            Create club
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  return (
    <section className="kx-hero">
      <div
        className="kx-flood"
        aria-hidden="true"
        style={{
          top: -120,
          left: "8%",
          width: 520,
          height: 720,
          background: "radial-gradient(ellipse at 50% 0%, rgba(217,242,74,.10), rgba(217,242,74,0) 65%)",
        }}
      />
      <div
        className="kx-flood"
        aria-hidden="true"
        style={{
          top: -160,
          right: "4%",
          width: 620,
          height: 780,
          background: "radial-gradient(ellipse at 50% 0%, rgba(54,201,143,.13), rgba(54,201,143,0) 65%)",
          animationDelay: "-2.5s",
        }}
      />
      <div className="kx-wrap-wide kx-hero-grid">
        <div className="kx-hero-copy">
          <span className="kx-badge kx-eyebrow kx-rise">
            <span className="kx-dot" />
            For badminton &amp; pickleball queue masters
          </span>
          <h1 className="kx-d kx-h1">
            <span className="kx-rise" style={{ animationDelay: ".08s" }}>
              Queue smarter.
            </span>
            <span className="kx-rise kx-volt" style={{ position: "relative", animationDelay: ".2s" }}>
              Play more.
              <svg className="kx-h1-arc" aria-hidden="true" viewBox="0 0 600 60" preserveAspectRatio="none">
                <path
                  className="kx-draw"
                  d="M6 50 C 160 -10, 420 -10, 594 40"
                  fill="none"
                  stroke="var(--kx-accent)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>
          <p className="kx-hero-sub kx-rise" style={{ animationDelay: ".32s" }}>
            Ditch the notebook, the paddle stack and the group-chat chaos. KRO5 runs your whole game night — who&apos;s up
            next, which court is live, who owes what — from one phone.
          </p>
          <div className="kx-row kx-rise" style={{ animationDelay: ".44s" }}>
            <Link className="kx-btn kx-btn-lg kx-btn-primary" href="/signup">
              Create your club — free <Arrow />
            </Link>
            <Link className="kx-btn kx-btn-lg kx-btn-ghost" href="/join">
              I&apos;m a player — see the queue
            </Link>
          </div>
          <a className="kx-tour-link kx-link kx-rise" href="#tour" style={{ animationDelay: ".52s" }}>
            <span className="kx-tour-link-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 4l13 8-13 8z" />
              </svg>
            </span>
            Watch the 20-second tour
          </a>
          <ul className="kx-checks kx-rise" style={{ animationDelay: ".6s" }}>
            {["Works on any phone", "Nothing to install", "Keeps working offline", "Free to start"].map((t) => (
              <li key={t}>
                <Check size={16} />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <HeroCourt />
      </div>
    </section>
  );
}

/* ───────────────────────────── Marquee ───────────────────────────── */

const BAND_A = ["Live queue", "Up-next buzz", "Live court view", "GCash QR", "Fair fee split", "Leaderboards", "Offline mode"];
const BAND_B = ["Rally to 21", "Games to 11", "The kitchen drawn in", "Tap to crown winners", "Today's MVP", "No app to download"];

function Marquee() {
  return (
    <section className="kx-marquee" aria-label="What KRO5 does">
      <div className="kx-band kx-band-volt">
        <div className="kx-track kx-d">
          {[0, 1].map((copy) =>
            BAND_A.map((t) => (
              <span key={`${copy}-${t}`} aria-hidden={copy === 1 || undefined} style={{ display: "flex", gap: 40 }}>
                <span>{t}</span>
                <span aria-hidden="true">•</span>
              </span>
            ))
          )}
        </div>
      </div>
      <div className="kx-band kx-band-dark" aria-hidden="true">
        <div className="kx-track kx-d">
          {[0, 1].map((copy) =>
            BAND_B.map((t) => (
              <span key={`${copy}-${t}`} style={{ display: "flex", gap: 40 }}>
                <span>{t}</span>
                <span>/</span>
              </span>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Tour ───────────────────────────── */

function Tour() {
  return (
    <section id="tour" className="kx-section" style={{ paddingBottom: 72, scrollMarginTop: 72 }}>
      <div className="kx-wrap kx-stack">
        <div className="kx-head-row kx-reveal">
          <div className="kx-head" style={{ maxWidth: 720 }}>
            <span className="kx-eyebrow">The 20-second tour</span>
            <h2 className="kx-d kx-h2">Watch a whole game night run itself.</h2>
          </div>
          <p className="kx-lede" style={{ maxWidth: 360 }}>
            From the first player through the door to the last GCash payment — four taps, zero spreadsheets.
          </p>
        </div>
        <TourFilm />
      </div>
    </section>
  );
}

/* ───────────────────────────── Stats ───────────────────────────── */

function Stats() {
  return (
    <section style={{ padding: "8px 20px 88px" }}>
      <div className="kx-wrap kx-stats kx-reveal">
        <div className="kx-stat">
          <b className="kx-d kx-volt">Live</b>
          <span>queue that updates on every phone</span>
        </div>
        <div className="kx-stat">
          <b className="kx-d">2</b>
          <span>numbers to price a whole session</span>
        </div>
        <div className="kx-stat">
          <b className="kx-d" style={{ color: "var(--kx-accent)" }}>
            Buzz
          </b>
          <span>on your phone when it&apos;s your turn</span>
        </div>
        <div className="kx-stat">
          <b className="kx-d">0</b>
          <span>apps for your players to download</span>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Sports ───────────────────────────── */

function Sports() {
  return (
    <section id="sports" className="kx-section" style={{ paddingTop: 40, scrollMarginTop: 72 }}>
      <div className="kx-wrap kx-stack">
        <div className="kx-head kx-reveal" style={{ maxWidth: 760 }}>
          <span className="kx-eyebrow">Your sport, your rules</span>
          <h2 className="kx-d kx-h2">Made for badminton halls and pickleball courts.</h2>
          <p className="kx-lede" style={{ fontSize: 18 }}>
            Pick your sport when you create your club — the wording, scoring, court view and fees all follow.
          </p>
        </div>
        <div className="kx-grid">
          <article className="kx-card kx-reveal" style={{ borderRadius: 28 }}>
            <div className="kx-sport-art" aria-hidden="true" style={{ background: "var(--kx-court)" }}>
              <BadmintonLines className="kx-court-svg" opacity={0.5} preserve="xMidYMid slice" />
              <div className="kx-fly" style={{ top: 100, animationDuration: "3.6s" }}>
                <div className="kx-flyy" style={{ animationDuration: "3.6s" }}>
                  <Shuttle width={64} className="kx-glow" />
                </div>
              </div>
              <span className="kx-d kx-sport-num">21</span>
            </div>
            <div className="kx-card-body" style={{ padding: 28, gap: 16 }}>
              <h3 className="kx-d" style={{ fontSize: 44, lineHeight: 1 }}>
                Badminton
              </h3>
              <CheckList
                items={[
                  "Doubles queue with Magic Queue suggestions",
                  "Pay per game played — whoever plays more, pays more",
                  "Rally scoring to 21, tap-to-crown winners",
                ]}
              />
            </div>
          </article>
          <article className="kx-card kx-reveal" style={{ borderRadius: 28 }}>
            <div className="kx-sport-art" aria-hidden="true" style={{ background: "var(--kx-court-pb)" }}>
              <PickleballLines className="kx-court-svg" opacity={0.5} preserve="xMidYMid slice" />
              <span className="kx-kitchen-tag">The kitchen</span>
              <div className="kx-mx" style={{ bottom: 112 }}>
                <div className="kx-by">
                  <div className="kx-spin" style={{ width: 0, height: 0 }}>
                    <Ball className="kx-ball" size={34} />
                  </div>
                </div>
              </div>
              <span className="kx-d kx-sport-num">11</span>
            </div>
            <div className="kx-card-body" style={{ padding: 28, gap: 16 }}>
              <h3 className="kx-d" style={{ fontSize: 44, lineHeight: 1 }}>
                Pickleball
              </h3>
              <CheckList
                items={[
                  "Open-play queue that replaces the paddle stack",
                  "Flat open-play fee per player, plus per-game pricing",
                  "Games to 11, live courts with the kitchen drawn in",
                ]}
              />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="kx-list">
      {items.map((t) => (
        <li key={t}>
          <Check />
          {t}
        </li>
      ))}
    </ul>
  );
}

/* ───────────────────────────── How it works ───────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      t: "Open a session",
      d: "Enter the court fee and your price per game. Add whoever showed up — paste a whole roster at once, new faces take seconds.",
      style: { background: "var(--kx-volt)", color: "var(--kx-volt-ink)" },
    },
    {
      t: "Line up the games",
      d: "Queue matchups, watch them move onto a live court, and tap the winning side when the game ends.",
      style: { background: "var(--kx-surface-2)", border: "2px solid var(--kx-volt)", color: "var(--kx-volt)" },
    },
    {
      t: "Everyone pays fair",
      d: "Each player's share is worked out for you. Show the payment QR, mark GCash or cash, done.",
      style: { background: "var(--kx-accent)", color: "var(--kx-accent-ink)" },
    },
  ];
  return (
    <section className="kx-section kx-section-alt" style={{ paddingTop: 72 }}>
      <div className="kx-wrap kx-stack" style={{ gap: 48 }}>
        <div className="kx-head kx-reveal" style={{ maxWidth: 820 }}>
          <span className="kx-eyebrow">How it works</span>
          <h2 className="kx-d kx-h2">From “who&apos;s next?” to “who paid?” — sorted.</h2>
        </div>
        <div style={{ position: "relative" }}>
          <svg className="kx-steps-line kx-hide-sm" aria-hidden="true" viewBox="0 0 1000 40" preserveAspectRatio="none">
            <path
              d="M0 20 C 160 -10, 330 50, 500 20 S 840 -10, 1000 20"
              fill="none"
              stroke="var(--kx-volt)"
              strokeWidth="2.5"
              strokeDasharray="6 10"
            />
          </svg>
          <ol className="kx-steps">
            {steps.map((s, i) => (
              <li key={s.t} className="kx-reveal">
                <span className="kx-d kx-step-num" style={s.style}>
                  {i + 1}
                </span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Features ───────────────────────────── */

function Feature({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <article className="kx-card kx-reveal">
      {children}
      <div className="kx-card-body">
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </article>
  );
}

function Features() {
  return (
    <section id="features" className="kx-section" style={{ paddingTop: 104, scrollMarginTop: 72 }}>
      <div className="kx-wrap-wide kx-stack" style={{ gap: 44 }}>
        <div className="kx-head-row kx-reveal">
          <div className="kx-head" style={{ maxWidth: 760 }}>
            <span className="kx-eyebrow">Features</span>
            <h2 className="kx-d kx-h2">Everything a game night needs. Nothing it doesn&apos;t.</h2>
          </div>
          <p className="kx-lede" style={{ maxWidth: 340 }}>
            Simple enough to use between games, with your racket or paddle still in the other hand.
          </p>
        </div>

        <div className="kx-grid" style={{ gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))" }}>
          <Feature
            title="A queue everyone can trust"
            body="Games flow Requested → Queued → Ongoing → Done. No more arguments about whose turn it is."
          >
            <div className="kx-vis kx-pills" aria-hidden="true">
              {["Requested", "Queued", "Ongoing", "Done"].map((t, i) => (
                <div key={t} className="kx-pillrow" style={{ marginLeft: i * 14 }}>
                  {t}
                  <i
                    style={{
                      animationDelay: `${i}s`,
                      ...(i === 3 ? { borderColor: "var(--kx-accent)", boxShadow: "0 0 18px rgba(54,201,143,.35)" } : {}),
                    }}
                  />
                </div>
              ))}
            </div>
          </Feature>

          <Feature
            title="Live court view"
            body="Ongoing games are drawn as real courts with the net down the middle. Tap a side to crown the winners."
          >
            <div className="kx-vis" aria-hidden="true">
              <div style={{ position: "relative", width: 220, height: 100, borderRadius: 8, background: "var(--kx-court)", overflow: "hidden" }}>
                <BadmintonLines className="kx-court-svg" stroke={12} opacity={0.8} />
                <span className="kx-ripple" style={{ left: "75%", top: "50%", width: 64, height: 64 }} />
                <span className="kx-ripple" style={{ left: "75%", top: "50%", width: 64, height: 64, animationDelay: ".8s" }} />
              </div>
            </div>
          </Feature>

          <Feature
            title="Simple, fair pricing"
            body="Court fee — split the rent or charge per player — plus a price per game. Set your own margin and see your earnings."
          >
            <div className="kx-vis" aria-hidden="true" style={{ flexDirection: "column", alignItems: "stretch", gap: 10, padding: 20 }}>
              <PriceLine label="Court share" value="₱100" />
              <PriceLine label="3 games × ₱25" value="₱75" />
              <div style={{ height: 1, background: "rgba(255,255,255,.12)" }} />
              <div
                className="kx-float"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "var(--kx-volt)",
                  color: "var(--kx-volt-ink)",
                  fontWeight: 800,
                }}
              >
                Your share <span className="kx-mono" style={{ fontSize: 20 }}>₱175</span>
              </div>
            </div>
          </Feature>

          <Feature
            title="Payment QR built in"
            body="Show your GCash QR on screen and track who paid by GCash, who paid cash, and who still owes."
          >
            <div className="kx-vis" aria-hidden="true" style={{ gap: 18 }}>
              <div className="kx-qr" style={{ width: 118, height: 118 }}>
                <QrArt />
                <span className="kx-scan" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, fontWeight: 900 }}>
                <span style={{ color: "#fff", background: "var(--kx-gcash)", padding: "5px 10px", borderRadius: 8 }}>GCash 12</span>
                <span style={{ color: "var(--kx-accent-ink)", background: "var(--kx-accent)", padding: "5px 10px", borderRadius: 8 }}>Cash 5</span>
                <span style={{ color: "var(--kx-volt-ink)", background: "var(--kx-volt)", padding: "5px 10px", borderRadius: 8 }}>Owes 2</span>
              </div>
            </div>
          </Feature>

          <Feature
            title="Leaderboards & bragging rights"
            body="Wins, win rate and hot streaks — by session, last 30 days or all time. Plus a Today's MVP every session."
          >
            <div className="kx-vis" aria-hidden="true" style={{ alignItems: "flex-end", gap: 14, padding: "22px 20px 18px" }}>
              {[
                { n: "Kat", h: 70, c: "var(--kx-accent)", d: ".2s" },
                { n: "Ana", h: 104, c: "var(--kx-volt)", d: "0s", top: true },
                { n: "Migs", h: 86, c: "var(--kx-accent)", d: ".1s" },
                { n: "Rico", h: 52, c: "#2B4A3F", d: ".3s" },
              ].map((b) => (
                <div key={b.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  {b.top && <Crown size={18} color="var(--kx-volt)" />}
                  <div className="kx-bar" style={{ width: 34, height: b.h, background: b.c, animationDelay: b.d }} />
                  <span style={{ fontSize: 12, fontWeight: b.top ? 800 : 700, color: b.top ? "var(--kx-text)" : "var(--kx-muted)" }}>
                    {b.n}
                  </span>
                </div>
              ))}
            </div>
          </Feature>

          <Feature
            title="“You're up next!” alerts"
            body="Players pick their name on the live queue page and their phone buzzes when their game is next. No more shouting across the hall."
          >
            <div className="kx-vis" aria-hidden="true">
              <span className="kx-ring" />
              <span className="kx-ring" style={{ animationDelay: ".25s" }} />
              <div className="kx-phone">
                <span
                  style={{
                    width: "100%",
                    padding: "6px 4px",
                    borderRadius: 8,
                    background: "var(--kx-volt)",
                    color: "var(--kx-volt-ink)",
                    fontSize: 9,
                    fontWeight: 900,
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  You&apos;re up next!
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--kx-muted)" }}>Court 2</span>
              </div>
            </div>
          </Feature>

          <Feature
            title="Works when the signal doesn't"
            body="Gym Wi-Fi dropped? Keep queuing. Changes are saved on your phone and sync the moment you're back online."
          >
            <div className="kx-vis" aria-hidden="true">
              <div className="kx-swap kx-swap-a">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 2l20 20M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 015.2-2.8M19 12.9a10 10 0 00-2.2-1.6M2 8.8a15 15 0 014.2-2.6M22 8.8A15 15 0 0010.7 5M12 20h.01" />
                </svg>
                Saved on this phone
              </div>
              <div className="kx-swap kx-swap-b">
                <svg className="kx-spin" style={{ animationDuration: "1.4s" }} width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 01-15.5 6.2M3 12a9 9 0 0115.5-6.2" />
                  <path d="M21 4v4h-4M3 20v-4h4" />
                </svg>
                Back online — synced
              </div>
            </div>
          </Feature>

          <div className="kx-cta-card kx-reveal">
            <h3 className="kx-d" style={{ margin: 0, fontSize: 52, lineHeight: 0.92 }}>
              Free to start. Ready tonight.
            </h3>
            <Link
              className="kx-btn"
              href="/signup"
              style={{ alignSelf: "flex-start", background: "var(--kx-volt-ink)", color: "var(--kx-volt)" }}
            >
              Create your club <Arrow />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PriceLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 600, color: "var(--kx-muted)" }}>
      {label}
      <span className="kx-mono" style={{ color: "var(--kx-text)" }}>
        {value}
      </span>
    </div>
  );
}

/* ───────────────────────────── Two sides ───────────────────────────── */

function TwoSides() {
  return (
    <section id="players" className="kx-section" style={{ paddingTop: 40, scrollMarginTop: 72 }}>
      <div className="kx-wrap kx-stack" style={{ gap: 44 }}>
        <div className="kx-head kx-reveal" style={{ maxWidth: 820 }}>
          <span className="kx-eyebrow">For everyone on court</span>
          <h2 className="kx-d kx-h2">Made for the person running it — and the people playing.</h2>
        </div>
        <div className="kx-grid">
          <article className="kx-card kx-reveal" style={{ borderRadius: 28, padding: 32, gap: 20 }}>
            <span className="kx-eyebrow kx-volt">Queue masters</span>
            <h3 className="kx-d" style={{ margin: 0, fontSize: 44, lineHeight: 0.95 }}>
              Run the whole night from one screen.
            </h3>
            <CheckList
              items={[
                "Create sessions and add a whole roster in seconds",
                "Price sessions with a court fee + price per game",
                "Queue games and move them onto live courts",
                "Record winners with a single tap",
                "See exactly who owes what — and collect it",
                "Made a mistake? Edit a game or reopen a session",
              ]}
            />
            <Link className="kx-btn kx-btn-primary" href="/signup" style={{ marginTop: "auto", alignSelf: "flex-start" }}>
              Create your club
            </Link>
          </article>
          <article className="kx-card kx-reveal" style={{ borderRadius: 28, padding: 32, gap: 20 }}>
            <span className="kx-eyebrow kx-volt">Players</span>
            <h3 className="kx-d" style={{ margin: 0, fontSize: 44, lineHeight: 0.95 }}>
              Know when you&apos;re up — without asking.
            </h3>
            <div className="kx-code" aria-hidden="true">
              {["4", "8", "2", "9", "1", "6"].map((d, i) => (
                <span
                  key={i}
                  className="kx-mono"
                  style={{
                    animationDelay: `${i * 0.25}s`,
                    ...(i === 5 ? { borderColor: "var(--kx-volt)", color: "var(--kx-volt)" } : {}),
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
            <CheckList
              items={[
                "Scan the session QR or enter the 6-digit code",
                "Watch the live queue and see what's on court",
                "Get buzzed when you're up next",
                "Request a game right from your phone",
                "No account and no app to install",
              ]}
            />
            <Link className="kx-btn kx-btn-volt-ghost" href="/join" style={{ marginTop: "auto", alignSelf: "flex-start" }}>
              Find a session
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Final CTA ───────────────────────────── */

function FinalCta() {
  return (
    <section className="kx-final">
      <div className="kx-outline" aria-hidden="true">
        <div className="kx-track kx-d">
          {[0, 1, 2, 3].map((i) => (
            <span key={i}>More rallies</span>
          ))}
        </div>
      </div>
      <div className="kx-fly" aria-hidden="true" style={{ top: 80 }}>
        <div className="kx-flyy">
          <Shuttle width={72} />
        </div>
      </div>
      <div className="kx-final-inner kx-reveal">
        <h2 className="kx-d" style={{ margin: 0, fontSize: "clamp(56px, 8vw, 120px)", lineHeight: 0.88 }}>
          Ready for your smoothest game night yet?
        </h2>
        <p style={{ margin: 0, fontSize: 20, color: "var(--kx-soft)" }}>
          Less shouting across the court. <span className="kx-volt" style={{ fontWeight: 800 }}>More rallies.</span>
        </p>
        <div className="kx-row" style={{ justifyContent: "center" }}>
          <Link className="kx-btn kx-btn-lg kx-btn-primary" href="/signup">
            Create your club — free
          </Link>
          <Link className="kx-btn kx-btn-lg kx-btn-ghost" href="/join">
            Join a game
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Footer ───────────────────────────── */

function Footer() {
  return (
    <footer className="kx-footer">
      <div className="kx-wrap-wide" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20 }}>
        <Logo small />
        <nav aria-label="Footer" style={{ marginLeft: "auto", display: "flex", flexWrap: "wrap", gap: 22, fontSize: 14 }}>
          <Link className="kx-link" href="/join">
            Join a game
          </Link>
          <Link className="kx-link" href="/login">
            Sign in
          </Link>
          <Link className="kx-link" href="/signup">
            Create club
          </Link>
          {CONTACT_EMAIL && (
            <a className="kx-link" href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("KRO5 for our group")}`}>
              Get KRO5 for your group
            </a>
          )}
        </nav>
        <span style={{ width: "100%", fontSize: 13, color: "var(--kx-faint)" }}>© {new Date().getFullYear()} KRO5</span>
      </div>
    </footer>
  );
}
