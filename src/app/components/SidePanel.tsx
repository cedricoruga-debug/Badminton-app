"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconCalendar, IconHome, IconKey, IconLogout, IconUsers } from "@/app/components/icons";
import { SettingsButton } from "@/app/components/SettingsButton";
import { createClient } from "@/lib/supabase/client";
import type { AppSettings } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/sessions", label: "Sessions", icon: IconCalendar },
  { href: "/player-sessions", label: "Players", icon: IconUsers },
];

/**
 * App navigation. On desktop this is a persistent icon rail pinned to the
 * right edge, under the header. Below the `md` breakpoint (phones/small
 * tablets) that rail would sit awkwardly off to the side and eat into the
 * already-narrow content width, so instead we render the same links as a
 * thumb-reachable bar fixed to the bottom of the screen. Only one of the
 * two is ever visible at a time — the other is hidden with CSS, not
 * unmounted, so each keeps its own state (e.g. the Settings popup).
 */
export function SidePanel({ settings }: { settings: AppSettings | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navLinks = (
    <>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-label={label}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
              active ? "bg-brand text-white" : "text-black/50 hover:bg-brand-light hover:text-brand"
            }`}
          >
            <Icon className="h-5 w-5" />
          </Link>
        );
      })}

      <SettingsButton settings={settings} />

      <Link
        href="/users"
        title="Accounts"
        aria-label="Accounts"
        className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
          pathname === "/users" ? "bg-brand text-white" : "text-black/50 hover:bg-brand-light hover:text-brand"
        }`}
      >
        <IconKey className="h-5 w-5" />
      </Link>
    </>
  );

  return (
    <>
      {/* Desktop: right-hand icon rail */}
      <nav className="sticky top-[60px] hidden h-[calc(100vh-60px)] w-16 flex-none flex-col items-center gap-3 border-l border-black/10 bg-white pt-4 landscape:flex">
        {navLinks}
        <button
          type="button"
          onClick={handleLogout}
          title="Log out"
          aria-label="Log out"
          className="mt-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-black/50 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <IconLogout className="h-5 w-5" />
        </button>
      </nav>

      {/* Mobile: bottom nav bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-black/10 bg-white px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] landscape:hidden">
        {navLinks}
        <button
          type="button"
          onClick={handleLogout}
          title="Log out"
          aria-label="Log out"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-black/50 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <IconLogout className="h-5 w-5" />
        </button>
      </nav>
    </>
  );
}
