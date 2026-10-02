"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClubContext, USERNAME_DOMAIN, type ClubContext, type Role } from "@/lib/accounts";

export type ActionResult = { error: string } | { error?: undefined };

function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

function parseRole(raw: FormDataEntryValue | null): Role {
  return raw === "admin" ? "admin" : "user";
}

/**
 * Every action here manages other people's login accounts, so it requires a
 * signed-in admin of a club — and every action that targets another account
 * also checks that account belongs to the SAME club (see
 * requireSameClubMember), so one club's admin can never touch another
 * club's logins even with a known user id.
 *
 * Expected/validation failures are returned as data (`{ error }`) rather
 * than thrown — in production, Next.js scrubs the message off any error
 * actually *thrown* from a Server Action before it reaches the browser, so
 * a throw would only ever show a generic "something went wrong". See
 * https://react.dev/errors/441 for that redaction behavior.
 */
async function requireAdmin(): Promise<ClubContext | { error: string }> {
  const ctx = await getClubContext();
  if (!ctx) return { error: "Not signed in." };
  if (ctx.role !== "admin") return { error: "Only an admin can do that." };
  return ctx;
}

/** The target account's membership row, read through RLS — so it's only
 * found when it belongs to the caller's own club. */
async function requireSameClubMember(userId: string): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "That account isn't in your club." };
  return { ok: true };
}

/** Create a new login account (the "Add account" form on /users). */
export async function createAccount(formData: FormData): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { error: ctx.error };

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  const role = parseRole(formData.get("role"));
  if (!username) return { error: "Username is required." };
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, - and _." };
  }
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  // Usernames are global (they're the login), so a name another club
  // already uses is "taken" here too.
  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: `${username}${USERNAME_DOMAIN}`,
    password,
    email_confirm: true,
  });
  if (error || !created.user) {
    return {
      error: error?.message.includes("already been registered")
        ? `"${username}" is already taken — try another username.`
        : (error?.message ?? "Couldn't create the account."),
    };
  }

  const { error: memberError } = await admin.from("club_members").insert({
    club_id: ctx.club.id,
    user_id: created.user.id,
    role,
    login: username,
  });
  if (memberError) {
    // Don't leave a login behind that belongs to no club.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: memberError.message };
  }

  revalidatePath("/users");
  return {};
}

/** Remove a login account. Can't delete the one you're currently signed in
 * as, so you can't accidentally lock yourself out. */
export async function deleteAccount(userId: string): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { error: ctx.error };
  if (userId === ctx.userId) {
    return { error: "You can't delete the account you're currently signed in as." };
  }
  if (userId === ctx.club.owner_id) {
    return { error: "The club owner's account can't be deleted." };
  }
  const member = await requireSameClubMember(userId);
  if ("error" in member) return { error: member.error };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}

/** Set a new password for someone else's account — for when they forget
 * theirs. Staff accounts don't have a real email address, so this is their
 * only way back in (owners can also use "Forgot password" on the login page). */
export async function resetAccountPassword(
  userId: string,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { error: ctx.error };
  const member = await requireSameClubMember(userId);
  if ("error" in member) return { error: member.error };

  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}

/** Change an account's role between Admin and User. Can't change your own
 * role — same self-protection as deleteAccount, so an admin can't fat-finger
 * their way into locking themselves out of account management. */
export async function updateAccountRole(userId: string, role: Role): Promise<ActionResult> {
  const ctx = await requireAdmin();
  if ("error" in ctx) return { error: ctx.error };
  if (userId === ctx.userId) {
    return { error: "You can't change the role of the account you're currently signed in as." };
  }
  if (userId === ctx.club.owner_id) {
    return { error: "The club owner is always an admin." };
  }
  const member = await requireSameClubMember(userId);
  if ("error" in member) return { error: member.error };

  const admin = createAdminClient();
  const { error } = await admin
    .from("club_members")
    .update({ role })
    .eq("user_id", userId)
    .eq("club_id", ctx.club.id);
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}
