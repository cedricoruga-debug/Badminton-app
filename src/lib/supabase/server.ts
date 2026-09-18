import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Route Handlers, and Server Actions.
 *
 * `global.fetch` is overridden to force `cache: "no-store"` on every request.
 * Without this, Supabase's GET requests (every `.select()`) go through
 * Next.js's own patched `fetch`, which caches GET responses by URL unless
 * told not to — regardless of `export const dynamic = "force-dynamic"` on
 * the page. That silently broke read-after-write flows like
 * recomputePlayerGameCounts: it writes a game, then immediately re-selects
 * games for that session to recount them, and without this override that
 * re-select could be served from cache and miss the write that just
 * happened, leaving total_games/payable stuck on a stale value.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
      global: {
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
