import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The app logs in with a plain username, but Supabase Auth only knows
 * "email" — so every account's real login email is `<username>@badminton.local`,
 * a fake domain that never sends or receives real mail. See
 * src/app/login/page.tsx for the sign-in side of this.
 */
export const USERNAME_DOMAIN = "@badminton.local";

export type Role = "admin" | "user";

export type Account = {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
};

/** Pulls the role out of a Supabase Auth user's app_metadata (set only by
 * the admin API, never editable by the user themselves) — anyone created
 * before roles existed has no role set yet, so they default to "user". */
function roleFromAppMetadata(appMetadata: Record<string, unknown> | undefined): Role {
  return appMetadata?.role === "admin" ? "admin" : "user";
}

/** Every login account in the app, oldest first. */
export async function listAccounts(): Promise<Account[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (error) throw new Error(error.message);

  return data.users
    .filter((u): u is typeof u & { email: string } => !!u.email?.endsWith(USERNAME_DOMAIN))
    .map((u) => ({
      id: u.id,
      username: u.email.slice(0, -USERNAME_DOMAIN.length),
      role: roleFromAppMetadata(u.app_metadata),
      createdAt: u.created_at,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** The current signed-in user's role, straight off their own Supabase Auth
 * session (no extra query needed — `getUser()`/`getSession()` already
 * includes app_metadata). Used to decide what the nav shows and to gate
 * admin-only pages/actions. */
export function currentUserRole(user: { app_metadata?: Record<string, unknown> } | null | undefined): Role {
  return roleFromAppMetadata(user?.app_metadata);
}
