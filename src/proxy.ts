import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Gatekeeper for the whole app — Next.js 16 renamed `middleware.ts` to
 * `proxy.ts` (same mechanism, new name/export). Every request except
 * `/login`, `/join` and `/welcome` (marketing page, served at "/" when signed out) requires a signed-in Supabase user; unauthenticated
 * visitors are bounced to `/login`, and a signed-in user hitting `/login`
 * (or `/join` — an admin has no reason to be there) is bounced to `/`.
 * `/join` is the one deliberately public page: a player without an account
 * uses it to view a session's live queue by code (see JoinForm.tsx) — two
 * security-definer functions (find_session_by_join_code, get_queue_by_code
 * in schema.sql) are what actually limit what an anonymous visitor there
 * can read, not this check. This proxy is what makes every other page
 * private instead of open to anyone who finds the URL.
 *
 * Uses `getSession()` (reads the session straight out of the request
 * cookie, no network call) rather than `getUser()` (asks Supabase's Auth
 * server to re-verify the token — a real round trip). This runs on every
 * single request the app makes, so that round trip was adding noticeable
 * delay to every click. The trade-off: a forged/expired cookie could slip
 * past this check instead of being bounced straight to /login — but every
 * actual data read/write still goes through Supabase with that same cookie,
 * and Supabase itself rejects an invalid token there, so the practical risk
 * for this small private app is low (worst case is a confusing error
 * instead of a redirect, not exposed data).
 */
const PUBLIC_PATHS = ["/login", "/join", "/welcome"];

/** Public pages a signed-in user has no reason to see, so they're bounced to
 * the dashboard instead. `/welcome` (the marketing page) is deliberately not
 * in here — anyone may look at it, signed in or not. */
const SIGNED_OUT_ONLY_PATHS = ["/login", "/join"];

export async function proxy(request: NextRequest) {
  // No Supabase configured yet (first-run / local setup) — let the
  // setup-required screen handle it instead of crashing here.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // The site's front door: a signed-out visitor to "/" sees the marketing
  // page (rewritten, so the URL stays "/"), while a signed-in queue master
  // gets the dashboard at the very same URL.
  if (!session && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    const rewritten = NextResponse.rewrite(url);
    response.cookies.getAll().forEach((c) => rewritten.cookies.set(c));
    return rewritten;
  }

  if (!session && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && SIGNED_OUT_ONLY_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
