import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersManager } from "@/app/components/UsersManager";
import { getClubContext, listAccounts } from "@/lib/accounts";

export const dynamic = "force-dynamic";

/**
 * Account management — add/remove/reset-password/change-role for the
 * people allowed to sign in to this app. Admin-only: the Accounts icon in
 * the nav only shows for admins in the first place, and this page
 * double-checks server-side (same belt-and-suspenders reasoning as the
 * Server Actions in ./actions.ts) so a non-admin can't just type the URL.
 */
export default async function UsersPage() {
  const ctx = await getClubContext();
  if (!ctx || ctx.role !== "admin") {
    redirect("/");
  }

  const accounts = await listAccounts(ctx.club);

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
        Everyone who can sign in to run {ctx.club.name}. Staff sign in with the username you give them here.
      </p>

      <UsersManager accounts={accounts} currentUserId={ctx.userId} />
    </div>
  );
}
