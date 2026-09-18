import Link from "next/link";
import { UsersManager } from "@/app/components/UsersManager";
import { listAccounts } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Account management — add/remove/reset-password for the people allowed to
 * sign in to this app. Anyone signed in can manage accounts here (it's a
 * small trusted group, not a public app), so there's no separate "admin"
 * role — just don't share the link with anyone you wouldn't hand a login to.
 */
export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const accounts = await listAccounts();

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="mb-4 flex items-center gap-2 text-sm text-black/50">
        <Link href="/" className="hover:text-brand">
          Home
        </Link>
        <span>›</span>
        <span className="text-black/80">Accounts</span>
      </div>

      <p className="mb-6 text-sm text-black/50">
        Everyone who can sign in to this app. Add a person here instead of through Supabase directly.
      </p>

      <UsersManager accounts={accounts} currentUserId={user?.id ?? ""} />
    </div>
  );
}
