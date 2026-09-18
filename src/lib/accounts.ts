import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The app logs in with a plain username, but Supabase Auth only knows
 * "email" — so every account's real login email is `<username>@badminton.local`,
 * a fake domain that never sends or receives real mail. See
 * src/app/login/page.tsx for the sign-in side of this.
 */
export const USERNAME_DOMAIN = "@badminton.local";

export type Account = {
  id: string;
  username: string;
  createdAt: string;
};

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
      createdAt: u.created_at,
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
