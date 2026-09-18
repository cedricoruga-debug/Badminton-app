"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USERNAME_DOMAIN } from "@/lib/accounts";

export type ActionResult = { error: string } | { error?: undefined };

function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Every action here manages other people's login accounts, so double-check
 * there's a signed-in user making the request — belt and suspenders on top
 * of proxy.ts, which already keeps every route but /login behind a login.
 *
 * Returns the signed-in user, or an ActionResult error to return as-is.
 * Expected/validation failures here are returned as data (`{ error }`)
 * rather than thrown — in production, Next.js scrubs the message off any
 * error actually *thrown* from a Server Action before it reaches the
 * browser (to avoid leaking server internals), so a throw would only ever
 * show the visitor a generic "something went wrong" with no detail. See
 * https://react.dev/errors/441 for that redaction behavior.
 */
async function requireSignedIn(): Promise<
  { user: { id: string } } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  return { user };
}

/** Create a new login account (the "Add account" form on /users). */
export async function createAccount(formData: FormData): Promise<ActionResult> {
  const signedIn = await requireSignedIn();
  if ("error" in signedIn) return { error: signedIn.error };

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!username) return { error: "Username is required." };
  if (!/^[a-z0-9_-]+$/.test(username)) {
    return { error: "Username can only contain letters, numbers, - and _." };
  }
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: `${username}${USERNAME_DOMAIN}`,
    password,
    email_confirm: true,
  });
  if (error) {
    return {
      error: error.message.includes("already been registered")
        ? `"${username}" is already taken.`
        : error.message,
    };
  }

  revalidatePath("/users");
  return {};
}

/** Remove a login account. Can't delete the one you're currently signed in
 * as, so you can't accidentally lock yourself out. */
export async function deleteAccount(userId: string): Promise<ActionResult> {
  const signedIn = await requireSignedIn();
  if ("error" in signedIn) return { error: signedIn.error };
  if (userId === signedIn.user.id) {
    return { error: "You can't delete the account you're currently signed in as." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}

/** Set a new password for someone else's account — for when they forget
 * theirs. There's no email-based reset flow here since accounts don't use
 * real email addresses, so this is the only way back in. */
export async function resetAccountPassword(
  userId: string,
  formData: FormData
): Promise<ActionResult> {
  const signedIn = await requireSignedIn();
  if ("error" in signedIn) return { error: signedIn.error };

  const password = String(formData.get("password") ?? "");
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };

  revalidatePath("/users");
  return {};
}
