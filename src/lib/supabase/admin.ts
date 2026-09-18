import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin-only Supabase client, authenticated with the service role key
 * instead of the public anon key. This bypasses Row Level Security
 * entirely and can manage Auth users directly (list / create / delete /
 * reset password) — powers the app's regular anon-key clients
 * intentionally don't have.
 *
 * `SUPABASE_SERVICE_ROLE_KEY` has no `NEXT_PUBLIC_` prefix on purpose:
 * Next.js only inlines `NEXT_PUBLIC_` vars into the browser bundle, so this
 * key never reaches the client. Only import this module from server-only
 * code ("use server" actions or Server Components) — never from a
 * "use client" file.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — account management needs both set."
    );
  }
  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
