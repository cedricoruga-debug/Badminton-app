"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type SignupResult = { error: string } | undefined;

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

/**
 * Sign-up: creates the owner's login (real email + password) and their
 * club in one go, signs them in, and lands them on their new, empty
 * dashboard.
 *
 * The account is created server-side with the admin API and marked
 * confirmed, rather than with a client-side signUp() that waits for a
 * confirmation email — Supabase's built-in mailer only delivers to the
 * project team's own addresses until a custom SMTP provider is set up, so
 * real customers would never receive that email. (Once SMTP is set up,
 * email verification can be switched on — see DEPLOY.md.)
 *
 * The club itself is created by the create_my_club() database function,
 * called as the newly signed-in user, so it's tied to auth.uid() and can't
 * be pointed at anyone else's account. If anything after the account is
 * created fails, the account is deleted again so the email can be reused.
 *
 * Also handles the "signed in, but no club yet" case (an earlier sign-up
 * that broke halfway) — then only the club fields are submitted.
 */
export async function signUpClub(_prev: SignupResult, formData: FormData): Promise<SignupResult> {
  const clubName = clean(formData.get("club_name"));
  const sport = clean(formData.get("sport"));
  const email = clean(formData.get("email")).toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!clubName) return { error: "Give your club a name." };
  if (clubName.length > 60) return { error: "Club name is too long (60 characters max)." };
  if (sport !== "badminton" && sport !== "pickleball") return { error: "Pick badminton or pickleball." };

  const supabase = await createClient();
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  // Finishing an earlier, half-done sign-up: already signed in, just needs a club.
  if (existingUser) {
    const { error } = await supabase.rpc("create_my_club", {
      club_name: clubName,
      club_sport: sport,
      my_login: existingUser.email?.endsWith("@badminton.local")
        ? existingUser.email.split("@")[0]
        : (existingUser.email ?? "owner"),
    });
    if (error) return { error: error.message };
    redirect("/");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (email.endsWith("@badminton.local")) return { error: "Use your real email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    const taken = createError?.message.toLowerCase().includes("already");
    return {
      error: taken
        ? "There's already an account with this email — sign in instead."
        : (createError?.message ?? "Couldn't create your account."),
    };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: signInError.message };
  }

  const { error: clubError } = await supabase.rpc("create_my_club", {
    club_name: clubName,
    club_sport: sport,
    my_login: email,
  });
  if (clubError) {
    await supabase.auth.signOut();
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: clubError.message };
  }

  redirect("/");
}
