"use client";

import { usePathname } from "next/navigation";
import { IconShuttle } from "@/app/components/icons";
import { SidePanel } from "@/app/components/SidePanel";
import type { AppSettings } from "@/lib/types";

const APP_TITLE = "Queuing App by Ced";

/**
 * Wraps every page with the header + right-hand icon rail — except
 * `/login`, which renders full-screen with none of that chrome (it has its
 * own centered card layout, and showing nav links to pages the visitor
 * can't use yet would be confusing).
 */
export function AppChrome({
  settings,
  isAdmin,
  children,
}: {
  settings: AppSettings | null;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 flex items-center gap-3 bg-brand px-4 py-3 text-white">
        <span className="flex h-8 w-8 flex-none items-center justify-center overflow-hidden rounded-full bg-white/15">
          {settings?.app_icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-uploaded image of unknown origin
            <img src={settings.app_icon_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <IconShuttle className="h-5 w-5" />
          )}
        </span>
        <h1 className="text-lg font-semibold">{APP_TITLE}</h1>
      </header>
      <div className="flex flex-1">
        {/* pb-20 clears the fixed bottom nav bar on mobile; not needed once
         * that bar disappears in favor of the desktop side rail at md. */}
        <div className="min-w-0 flex-1 pb-20 landscape:pb-0">{children}</div>
        <SidePanel settings={settings} isAdmin={isAdmin} />
      </div>
    </div>
  );
}
