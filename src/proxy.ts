import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Gatekeeper for the whole app — Next.js 16 renamed `middleware.ts` to
 * `proxy.ts` (same mechanism, new name/export). Every request except
 * `/login` and `/join` requires a signed-in Supabase user; unauthenticated
 * visitors are bounced to `/login`, and a signed-in user hitting `/login`
 * (or `/join` — an admin has no reason to be there) is bounced to `/`.
 * `/join` is the one deliberately public page: the self-service page a
 * player without an account uses to request a spot in a session by code
 * (see submitJoinRequest in actions.ts) — RLS on join_requests is what
 * actually limits what an anonymous visitor there can do, not this check.
 * This proxy is what makes every other page private instead of open to
 * anyone who finds the URL.
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
const PUBLIC_PATHS = ["/login", "/join"];

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

  const isPublicPath = PUBLIC_PATHS.includes(request.nextUrl.pathname);

  if (!session && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (session && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
