import { createClient } from "@/lib/supabase/server";
import type { Club } from "@/lib/types";

/**
 * Staff accounts log in with a plain username, but Supabase Auth only knows
 * "email" — so a staff account's real login email is
 * `<username>@badminton.local`, a fake domain that never sends or receives
 * real mail. Club owners sign up with their real email instead. The login
 * page accepts either (anything with an "@" is treated as an email).
 */
export const USERNAME_DOMAIN = "@badminton.local";

export type Role = "admin" | "user";

export type Account = {
  id: string;
  /** Username for staff accounts, email for a club owner. */
  username: string;
  role: Role;
  createdAt: string;
  /** The club's owner can't be deleted or demoted from the Accounts page. */
  isOwner: boolean;
};

export type ClubContext = {
  userId: string;
  role: Role;
  club: Club;
};

/**
 * The signed-in user's club and their role in it, in one query — or null
 * when nobody is signed in, or the account doesn't belong to a club yet
 * (a sign-up that didn't finish creating its club).
 *
 * Uses getSession() (reads the cookie, no network round trip) to learn the
 * user id; the club_members read itself still goes through Supabase with
 * that token, so a forged cookie just gets an empty result.
 */
export async function getClubContext(): Promise<ClubContext | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from("club_members")
    .select("role, club:clubs(*)")
    .eq("user_id", session.user.id)
    .maybeSingle();
  if (error) {
    console.error("[getClubContext] Supabase error:", error);
    return null;
  }
  if (!data?.club) return null;

  return {
    userId: session.user.id,
    role: data.role === "admin" ? "admin" : "user",
    club: data.club as unknown as Club,
  };
}

/** Every login account in the signed-in user's club, oldest first. */
export async function listAccounts(club: Club): Promise<Account[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_members")
    .select("user_id, role, login, created_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((m) => ({
    id: m.user_id,
    username: m.login,
    role: m.role === "admin" ? "admin" : "user",
    createdAt: m.created_at,
    isOwner: m.user_id === club.owner_id,
  }));
}
