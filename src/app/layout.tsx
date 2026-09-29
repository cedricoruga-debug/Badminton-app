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
import { currentUserRole } from "@/lib/accounts";
import { getAppSettings } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

const APP_TITLE = "KRO5 Badminton";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "Saturday badminton session queuing and fee tracker",
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

/** Whether the signed-in visitor is an admin — decides whether the nav
 * shows the Settings and Accounts icons at all (see SidePanel). Not signed
 * in (e.g. on /login) just means not an admin, same as any other visitor.
 *
 * Uses `getSession()` (reads the JWT out of the cookie, no network call)
 * rather than `getUser()` (a real round trip to Supabase's Auth server) —
 * same trade-off already made in proxy.ts, and for the same reason: this
 * runs in RootLayout, i.e. on every single page render, so a `getUser()`
 * here was adding a second per-request network round trip right back on
 * top of the one proxy.ts already eliminated. */
async function getIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return currentUserRole(session?.user ?? undefined) === "admin";
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [settings, isAdmin] = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? await Promise.all([getAppSettings(), getIsAdmin()])
    : [null, false];

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <AppChrome settings={settings} isAdmin={isAdmin}>
          {children}
        </AppChrome>
      </body>
    </html>
  );
}
