import type { Metadata } from "next";
import "./globals.css";
import { AppChrome } from "@/app/components/AppChrome";
import { getAppSettings } from "@/lib/queries";

const APP_TITLE = "Queuing App by Ced";

export const metadata: Metadata = {
  title: APP_TITLE,
  description: "Saturday badminton session queuing and fee tracker",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = process.env.NEXT_PUBLIC_SUPABASE_URL ? await getAppSettings() : null;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <AppChrome settings={settings}>{children}</AppChrome>
      </body>
    </html>
  );
}
