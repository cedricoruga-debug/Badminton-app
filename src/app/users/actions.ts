"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { USERNAME_DOMAIN } from "@/lib/accounts";

function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, "");
}

/** Every action here manages other people's login accounts, so double-check
 * there's a signed-in user making the request — belt and suspenders on top
 * of proxy.ts, which already keeps every route but /login behind a login. */
async function requireSignedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return user;
}

/** Create a new login account (the "Add account" form on /users). */
export async function createAccount(formData: FormData) {
  await requireSignedIn();

  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!username) throw new Error("Username is required.");
  if (!/^[a-z0-9_-]+$/.test(username)) {
    throw new Error("Username can only contain letters, numbers, - and _.");
  }
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: `${username}${USERNAME_DOMAIN}`,
    password,
    email_confirm: true,
  });
  if (error) {
    throw new Error(
      error.message.includes("already been registered")
        ? `"${username}" is already taken.`
        : error.message
    );
  }

  revalidatePath("/users");
}

/** Remove a login account. Can't delete the one you're currently signed in
 * as, so you can't accidentally lock yourself out. */
export async function deleteAccount(userId: string) {
  const user = await requireSignedIn();
  if (userId === user.id) {
    throw new Error("You can't delete the account you're currently signed in as.");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/users");
}

/** Set a new password for someone else's account — for when they forget
 * theirs. There's no email-based reset flow here since accounts don't use
 * real email addresses, so this is the only way back in. */
export async function resetAccountPassword(userId: string, formData: FormData) {
  await requireSignedIn();

  const password = String(formData.get("password") ?? "");
  if (password.length < 6) throw new Error("Password must be at least 6 characters.");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);

  revalidatePath("/users");
}
