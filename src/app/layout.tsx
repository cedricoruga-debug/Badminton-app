import type { Metadata, Viewport } from "next";
// Nunito — the Sage Sport brand kit's typeface ("friendly, modern,
// approachable"): 400 for body copy, 600 for buttons/labels/status chips,
// 700 for page titles/section headings, 800 for hero numbers/exciting
// moments (the big queue-position digit, etc). Self-hosted via @fontsource
// (the font files ship in the npm package itself) rather than
// next/font/google, which needs to reach fonts.googleapis.com at build
// time — self-hosting also means production never depends on Google's CDN
// being reachable. Wired to Tailwind's `font-sans` in globals.css, so every
// existing `font-sans`/default-text element picks it up automatically.
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/500.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./globals.css";
import { AppChrome } from "@/app/components/AppChrome";
import { getClubContext } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "KRO5 — Badminton & Pickleball queuing",
  description:
    "Fun, simple queuing for badminton and pickleball queue masters. Live courts, fair rotations, automatic fees and easy payments.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-512.png",
    apple: "/icons/icon-512.png",
  },
};

// A separate export from `metadata` above — Next.js splits viewport-related
// tags (theme-color included) out on purpose, see generate-viewport docs.
export const viewport: Viewport = {
  themeColor: "#36c98f",
};

/**
 * Who's looking: signed in or not, and if so which club and role. The club
 * row doubles as the "settings" the chrome needs (name, sport, icon, QR),
 * so this is a single club_members→clubs query per render — replacing the
 * old app_settings read, not adding to it. Signed-in detection uses
 * getSession() (cookie only, no network round trip), same trade-off as
 * proxy.ts.
 */
async function getAuthState() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { club: null, isAdmin: false, isSignedIn: false };
  const ctx = await getClubContext();
  return { club: ctx?.club ?? null, isAdmin: ctx?.role === "admin", isSignedIn: true };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { club, isAdmin, isSignedIn } = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? await getAuthState()
    : { club: null, isAdmin: false, isSignedIn: false };

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <AppChrome settings={club} isAdmin={isAdmin} isSignedIn={isSignedIn}>
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
