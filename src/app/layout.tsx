import type { Metadata } from "next";
import "./globals.css";
import { AppChrome } from "@/app/components/AppChrome";
import { currentUserRole } from "@/lib/accounts";
import { getAppSettings } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

const APP_TITLE = "Queuing App by Ced";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "Saturday badminton session queuing and fee tracker",
};

/** Whether the signed-in visitor is an admin — decides whether the nav
 * shows the Settings and Accounts icons at all (see SidePanel). Not signed
 * in (e.g. on /login) just means not an admin, same as any other visitor. */
async function getIsAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return currentUserRole(user ?? undefined) === "admin";
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
