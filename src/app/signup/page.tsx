import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClubContext } from "@/lib/accounts";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create your club — KRO5",
  description: "Start running your badminton or pickleball sessions with KRO5. Free to start.",
};

/**
 * Public sign-up: a queue master creates their club (name + sport) and the
 * owner login in one step. Already in a club → straight to the dashboard.
 * Signed in without a club (a sign-up that broke halfway) → just the club
 * part of the form.
 */
export default async function SignupPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect("/");

  const ctx = await getClubContext();
  if (ctx) redirect("/");

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return <SignupForm signedInEmail={session?.user.email ?? null} />;
}
