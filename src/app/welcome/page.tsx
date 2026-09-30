import type { Metadata } from "next";
import Link from "next/link";
import {
  IconCalendar,
  IconFlag,
  IconPeso,
  IconPhone,
  IconRacket,
  IconSearch,
  IconShuttle,
  IconTrophy,
  IconUsers,
} from "@/app/components/icons";

/**
 * The public marketing page. Signed-out visitors see it at "/" (proxy.ts
 * rewrites "/" here), and it's reachable directly at /welcome too. Purely
 * static — no data fetching — so it's fast and safe to show anyone.
 *
 * Every feature claim below maps to something the app really does (queue +
 * live courts, tap-to-record-winner, automatic fee split, GCash/cash
 * tracking + payment QR, join-by-QR live queue with "request a set", offline
 * support, live sync across devices). If a feature is removed, update the
 * copy here.
 *
 * Optional: set NEXT_PUBLIC_CONTACT_EMAIL to show a "Get KRO5 for your
 * group" contact button. Left unset, that button is simply not rendered.
 */

export const metadata: Metadata = {
  title: "KRO5 Badminton — fun, simple badminton queuing",
  description:
    "Run your badminton night without the chaos. Queue games, track courts live, split fees automatically and collect payments — built for queue masters and players.",
  openGraph: {
    title: "KRO5 Badminton — queue smarter, play more",
    description:
      "Fun, simple badminton queuing for queue masters and badminton enthusiasts. Live queue, automatic fees, easy payments.",
    type: "website",
  },
};

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export default function WelcomePage() {
  return (
    <div data-scroll-page className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <Features />
      <TwoSides />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ───────────────────────────── Nav ───────────────────────────── */

function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          light ? "bg-white/15 text-white" : "bg-brand text-white shadow-[0_4px_12px_-2px_rgba(54,201,143,0.6)]"
        }`}
      >
        <IconShuttle className="h-5 w-5" />
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-brand-dark"}`}>
        KRO5 <span className="font-semibold opacity-70">Badminton</span>
      </span>
    </span>
  );
}

function SiteNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand-dark/5 bg-background/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" aria-label="KRO5 Badminton home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-7 text-sm font-semibold text-brand-dark/70 md:flex">
          <a href="#how" className="hover:text-brand-dark">How it works</a>
          <a href="#features" className="hover:text-brand-dark">Features</a>
          <a href="#players" className="hover:text-brand-dark">For players</a>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/join"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-brand-dark hover:bg-brand-light sm:block"
          >
            Join a game
          </Link>
          <Link href="/login" className="btn-brand rounded-full px-5 py-2 text-sm font-bold">
            Sign in
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-brand">
      <div aria-hidden className="court-lines absolute inset-0 -z-10 opacity-60" />
      <div
        aria-hidden
        className="absolute -right-32 -top-32 -z-10 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-2xl"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-20">
        <div className="text-white">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider ring-1 ring-white/25">
            <IconShuttle className="h-3.5 w-3.5" />
            Built for queue masters &amp; badminton lovers
          </p>
          <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
            Queue smarter.
            <br />
            <span className="text-brand-dark">Play more.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-white/90 sm:text-xl">
            Ditch the notebook and the group-chat chaos. KRO5 runs your badminton night — who&apos;s up next, which
            court is live, who owes what — right from your phone.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="rounded-full bg-brand-dark px-7 py-3.5 text-base font-bold text-white shadow-[0_10px_24px_-8px_rgba(23,42,35,0.7)] transition hover:bg-accent-dark"
            >
              Start your session
            </Link>
            <Link
              href="/join"
              className="rounded-full bg-white px-7 py-3.5 text-base font-bold text-brand-dark transition hover:bg-brand-light"
            >
              I&apos;m a player — see the queue
            </Link>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-white/85">
            <li className="flex items-center gap-1.5"><Check /> Works on any phone</li>
            <li className="flex items-center gap-1.5"><Check /> Nothing to install</li>
            <li className="flex items-center gap-1.5"><Check /> Keeps working offline</li>
          </ul>
        </div>

        <HeroPhone />
      </div>
      {/* scalloped bottom edge into the next section */}
      <svg aria-hidden viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-8 w-full text-background sm:h-10">
        <path fill="currentColor" d="M0 40V20c120 20 240 20 360 8s240-28 360-24 240 24 360 26 240-12 360-22v32z" />
      </svg>
    </section>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 flex-none" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.25)" />
      <path d="m6 10.4 2.6 2.6L14 7.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A stylised phone showing the live queue — sample names, not real data. */
function HeroPhone() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
      <span
        aria-hidden
        className="float-slow absolute left-1 top-10 z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand shadow-xl [--r:-10deg] sm:-left-10"
      >
        <IconShuttle className="h-8 w-8" />
      </span>
      <span
        aria-hidden
        className="float-slower absolute right-1 bottom-24 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffd166] text-brand-dark shadow-xl [--r:8deg] sm:-right-8"
      >
        <IconTrophy className="h-6 w-6" />
      </span>

      <div className="rounded-[2.6rem] bg-brand-dark p-2.5 shadow-[0_40px_80px_-24px_rgba(23,42,35,0.75)] ring-1 ring-white/20">
        <div className="overflow-hidden rounded-[2.1rem] bg-background">
          <div className="flex items-center gap-2 bg-brand px-4 py-3 text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <IconShuttle className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold">Saturday Session</span>
            <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> LIVE
            </span>
          </div>

          <div className="space-y-4 p-4">
            {/* live court */}
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-dark/50">Now playing</p>
              <MiniCourt game={4} left={["Ana", "Ben"]} right={["Carlo", "Dee"]} />
            </div>

            {/* up next */}
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-dark/50">Up next</p>
              <div className="space-y-2">
                <QueueRow n={5} a="Migs & Joy" b="Paolo & Kat" tag="Next" hot />
                <QueueRow n={6} a="Rico & Liza" b="Sam & Tin" tag="Queued" />
              </div>
            </div>

            {/* payment */}
            <div className="flex items-center justify-between rounded-2xl bg-brand-light px-3.5 py-3 ring-1 ring-brand/30">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-dark/50">Your share</p>
                <p className="text-2xl font-extrabold leading-none text-brand-dark">₱ 90</p>
              </div>
              <span className="rounded-full bg-brand px-3.5 py-2 text-xs font-bold text-white">Pay with GCash</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCourt({ game, left, right }: { game: number; left: string[]; right: string[] }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-black/10">
      <div className="bg-black/80 py-1 text-center text-[11px] font-semibold text-white">Game {game}</div>
      <div className="relative flex bg-emerald-600 text-white">
        <span aria-hidden className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-white/90" />
        <span aria-hidden className="absolute inset-y-0 left-[8%] border-l border-white/45" />
        <span aria-hidden className="absolute inset-y-0 right-[8%] border-r border-white/45" />
        <span aria-hidden className="absolute inset-x-0 top-[9%] border-t border-white/45" />
        <span aria-hidden className="absolute inset-x-0 bottom-[9%] border-t border-white/45" />
        {[left, right].map((team, i) => (
          <div key={i} className="relative grid flex-1 grid-rows-2 py-1">
            {team.map((name) => (
              <span key={name} className="flex items-center justify-center py-2.5 text-sm font-extrabold [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]">
                {name}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function QueueRow({ n, a, b, tag, hot = false }: { n: number; a: string; b: string; tag: string; hot?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-soft ring-1 ring-brand-dark/5">
      <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg text-sm font-extrabold ${hot ? "bg-brand text-white" : "bg-brand-light text-brand-dark"}`}>
        {n}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm font-bold">
        {a} <span className="font-medium text-black/35">vs</span> {b}
      </p>
      <span className={`flex-none rounded-full px-2.5 py-1 text-[10px] font-bold ${hot ? "bg-[#ffd166] text-brand-dark" : "bg-black/5 text-black/45"}`}>
        {tag}
      </span>
    </div>
  );
}

/* ───────────────────────────── Trust strip ───────────────────────────── */

function TrustStrip() {
  const items = [
    { k: "Live", v: "queue that updates on every phone" },
    { k: "Auto", v: "court & shuttle fee split" },
    { k: "1 tap", v: "to record a winner" },
    { k: "0", v: "apps to download" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-6">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.k} className="rounded-2xl bg-white px-5 py-5 text-center shadow-soft ring-1 ring-brand-dark/5">
            <dt className="text-3xl font-extrabold text-brand">{i.k}</dt>
            <dd className="mt-1 text-sm font-semibold text-brand-dark/60">{i.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────────────────────────── How it works ───────────────────────────── */

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-extrabold uppercase tracking-widest text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-lg font-medium text-brand-dark/65">{sub}</p>}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    {
      icon: <IconCalendar className="h-6 w-6" />,
      title: "Open a session",
      body: "Set the court hours and shuttle cost once. Add whoever showed up — new faces take seconds.",
    },
    {
      icon: <IconRacket className="h-6 w-6" />,
      title: "Line up the games",
      body: "Queue matchups, watch them move onto a live court, and tap the winning side when the game ends.",
    },
    {
      icon: <IconPeso className="h-6 w-6" />,
      title: "Everyone pays fair",
      body: "Each player's share is worked out for you. Show the payment QR, mark GCash or cash, done.",
    },
  ];
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <SectionHead eyebrow="How it works" title="From “who's next?” to “who paid?” — sorted." />
      <ol className="mt-14 grid gap-6 md:grid-cols-3">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-3xl bg-white p-7 shadow-soft ring-1 ring-brand-dark/5">
            <span className="absolute -top-4 left-7 flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-sm font-extrabold text-white ring-4 ring-background">
              {i + 1}
            </span>
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand">{s.icon}</span>
            <h3 className="text-xl font-extrabold">{s.title}</h3>
            <p className="mt-2 font-medium leading-relaxed text-brand-dark/65">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────────────────────── Features ───────────────────────────── */

function Features() {
  const feats = [
    {
      icon: <IconUsers className="h-6 w-6" />,
      title: "A queue everyone can trust",
      body: "Games flow Requested → Queued → Ongoing → Done. No more arguments about whose turn it is.",
    },
    {
      icon: <IconFlag className="h-6 w-6" />,
      title: "Live court view",
      body: "Ongoing games are drawn as real courts with the net down the middle. Tap a side to crown the winners.",
    },
    {
      icon: <IconPeso className="h-6 w-6" />,
      title: "Automatic fee split",
      body: "Court time and shuttles are split by games played, rounded to a friendly amount. No calculator, no spreadsheet.",
    },
    {
      icon: <IconPhone className="h-6 w-6" />,
      title: "Payment QR built in",
      body: "Show your GCash QR on screen and track who's paid by GCash, who paid cash, and who still owes.",
    },
    {
      icon: <IconTrophy className="h-6 w-6" />,
      title: "Bragging rights",
      body: "Every session crowns a Today's MVP by win rate, and each player has a history you can look back on.",
    },
    {
      icon: <IconShuttle className="h-6 w-6" />,
      title: "Works when the signal doesn't",
      body: "Gym Wi-Fi dropped? Keep queuing. Changes are saved on your phone and sync the moment you're back online.",
    },
  ];
  return (
    <section id="features" className="scroll-mt-20 bg-brand-light/70 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead
          eyebrow="Features"
          title="Everything a badminton night needs. Nothing it doesn't."
          sub="Simple enough to use between games, with your racket still in the other hand."
        />
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {feats.map((f) => (
            <article
              key={f.title}
              className="group rounded-3xl bg-white p-7 shadow-soft ring-1 ring-brand-dark/5 transition hover:-translate-y-1 hover:ring-brand/40"
            >
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-[0_6px_14px_-4px_rgba(54,201,143,0.7)] transition group-hover:rotate-[-6deg]">
                {f.icon}
              </span>
              <h3 className="text-lg font-extrabold">{f.title}</h3>
              <p className="mt-2 font-medium leading-relaxed text-brand-dark/65">{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Two audiences ───────────────────────────── */

function TwoSides() {
  return (
    <section id="players" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
      <SectionHead eyebrow="For everyone on court" title="Made for the person running it — and the people playing." />
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-brand-dark p-8 text-white shadow-soft sm:p-10">
          <span className="inline-flex rounded-full bg-brand px-3 py-1 text-xs font-extrabold uppercase tracking-wider">Queue masters</span>
          <h3 className="mt-4 text-2xl font-extrabold sm:text-3xl">Run the whole night from one screen.</h3>
          <ul className="mt-6 space-y-3 font-medium text-white/85">
            {[
              "Create sessions and add players in seconds",
              "Queue games and move them onto live courts",
              "Record winners with a single tap",
              "See exactly who owes what — and collect it",
              "Made a mistake? Edit a game or reopen a session",
            ].map((t) => (
              <li key={t} className="flex gap-3"><CheckDark />{t}</li>
            ))}
          </ul>
          <Link href="/login" className="mt-8 inline-block rounded-full bg-brand px-6 py-3 font-bold text-white transition hover:bg-white hover:text-brand-dark">
            Sign in to your club
          </Link>
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-soft ring-1 ring-brand-dark/5 sm:p-10">
          <span className="inline-flex rounded-full bg-brand-light px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-brand">Players</span>
          <h3 className="mt-4 text-2xl font-extrabold sm:text-3xl">Know when you&apos;re up — without asking.</h3>
          <ul className="mt-6 space-y-3 font-medium text-brand-dark/75">
            {[
              "Scan the session QR or enter the 6-digit code",
              "Watch the live queue and see what's on court",
              "Request a set right from your phone",
              "No account and no app to install",
            ].map((t) => (
              <li key={t} className="flex gap-3"><CheckGreen />{t}</li>
            ))}
          </ul>
          <Link href="/join" className="btn-brand mt-8 inline-flex items-center gap-2 rounded-full px-6 py-3 font-bold">
            <IconSearch className="h-4 w-4" /> Find a session
          </Link>
        </div>
      </div>
    </section>
  );
}

function CheckDark() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 flex-none" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="#36c98f" />
      <path d="m6 10.4 2.6 2.6L14 7.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckGreen() {
  return (
    <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 flex-none" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="10" fill="#eaf8ef" />
      <path d="m6 10.4 2.6 2.6L14 7.6" stroke="#36c98f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ───────────────────────────── Final CTA + footer ───────────────────────────── */

function FinalCta() {
  return (
    <section className="px-4 pb-20 sm:px-6">
      <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-brand px-6 py-16 text-center text-white sm:px-12 sm:py-20">
        <div aria-hidden className="court-lines absolute inset-0 -z-10 opacity-60" />
        <IconShuttle className="float-slow mx-auto h-12 w-12 [--r:-8deg]" />
        <h2 className="mx-auto mt-5 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          Ready for your smoothest Saturday yet?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-white/90">
          Less shouting across the court. More rallies.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login" className="rounded-full bg-brand-dark px-8 py-3.5 text-base font-bold text-white transition hover:bg-accent-dark">
            Sign in
          </Link>
          {CONTACT_EMAIL ? (
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("KRO5 Badminton for my group")}`}
              className="rounded-full bg-white px-8 py-3.5 text-base font-bold text-brand-dark transition hover:bg-brand-light"
            >
              Get KRO5 for your group
            </a>
          ) : (
            <Link href="/join" className="rounded-full bg-white px-8 py-3.5 text-base font-bold text-brand-dark transition hover:bg-brand-light">
              Join a game
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-brand-dark/10 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm font-medium text-brand-dark/60 sm:flex-row sm:px-6">
        <Logo />
        <nav className="flex gap-6 font-semibold">
          <Link href="/join" className="hover:text-brand-dark">Join a game</Link>
          <Link href="/login" className="hover:text-brand-dark">Sign in</Link>
        </nav>
        <p>© {new Date().getFullYear()} KRO5 Badminton</p>
      </div>
    </footer>
  );
}
