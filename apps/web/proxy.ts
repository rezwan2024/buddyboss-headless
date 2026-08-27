import { type NextRequest, NextResponse } from "next/server";

// "Refresh-and-retry" can't literally live inside wp-fetch — a Server
// Component can't write cookies mid-render in Next.js, and that's the only
// place wp-fetch ever runs. This proxy (formerly "middleware" — renamed in
// Next 16) does the equivalent job proactively instead: refresh *before*
// the page renders, so by the time any Server Component reads the
// access-token cookie, it's already current. See DECISIONS.md for the full
// reasoning.

const ACCESS_TOKEN_COOKIE = "hl_access";
const REFRESH_TOKEN_COOKIE = "hl_refresh";
const USER_COOKIE = "hl_user";

const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60; // must match class-tokens.php REFRESH_TOKEN_TTL
const REFRESH_SKEW_SECONDS = 5 * 60; // refresh a bit before actual expiry, not exactly at it

function decodeJwtExpiry(token: string): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
    // Not verifying the signature here — that's WordPress's job when the
    // token is actually used. This is only a cheap "is it stale?" check to
    // decide whether to proactively refresh.
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Server Actions (login/logout) manage the session cookies themselves for
  // their own request — don't also race that with a proactive refresh here.
  // A Server Action POST carries this header; a plain page navigation never
  // does.
  if (request.headers.has("next-action")) return response;

  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) return response; // never logged in, or already fully logged out

  const exp = accessToken ? decodeJwtExpiry(accessToken) : null;
  const needsRefresh =
    !accessToken || exp === null || exp - REFRESH_SKEW_SECONDS < Date.now() / 1000;
  if (!needsRefresh) return response;

  const wpUrl = process.env.WP_URL;
  if (!wpUrl) return response;

  try {
    const res = await fetch(`${wpUrl.replace(/\/$/, "")}/wp-json/headless-auth/v1/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });

    const secure = process.env.NODE_ENV === "production";

    if (!res.ok) {
      // Refresh token itself is invalid/expired/revoked — clear the dead
      // session rather than looping through this refresh attempt on every
      // request until the cookie's own maxAge finally expires. Explicit
      // matching attributes, not .delete() — see lib/session.ts for why.
      const expired = { path: "/", maxAge: 0, secure, sameSite: "lax" as const };
      response.cookies.set(ACCESS_TOKEN_COOKIE, "", { ...expired, httpOnly: true });
      response.cookies.set(REFRESH_TOKEN_COOKIE, "", { ...expired, httpOnly: true });
      response.cookies.set(USER_COOKIE, "", { ...expired, httpOnly: false });
      return response;
    }

    const tokens = await res.json();

    response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: tokens.expires_in,
    });
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
    response.cookies.set(
      USER_COOKIE,
      // Don't pre-encode — see lib/session.ts for why (Next encodes for us).
      JSON.stringify({
        id: tokens.user.id,
        name: tokens.user.name,
        mentionName: tokens.user.mention_name,
      }),
      { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: REFRESH_TOKEN_MAX_AGE },
    );
  } catch {
    // WP unreachable — leave cookies as-is rather than logging the user
    // out over a transient network error. The stale access token will just
    // fail server-side (falls through to anonymous) until this succeeds.
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
