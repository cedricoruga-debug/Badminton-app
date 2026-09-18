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

/** Persistent icon rail pinned to the right edge, under the header. */
export function SidePanel({ settings }: { settings: AppSettings | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="sticky top-[60px] flex h-[calc(100vh-60px)] w-16 flex-none flex-col items-center gap-3 border-l border-black/10 bg-white pt-4">
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
  );
}
