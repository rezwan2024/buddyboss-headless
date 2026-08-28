// Cookie names, TTLs, and attribute shapes shared between `lib/session.ts`
// (Server Components/Actions, via `next/headers`' `cookies()`) and
// `proxy.ts` (Edge middleware, via `NextRequest`/`NextResponse`'s own
// cookie API) — two different runtimes that can't share the same
// `cookies()` import, but must never drift on security-relevant
// attributes (secure/sameSite/httpOnly) for the same three cookies. Both
// used to duplicate this inline; extracted after a Phase 6 cookie-flags
// audit flagged the duplication as a drift risk, not because either copy
// was actually wrong.
export const ACCESS_TOKEN_COOKIE = "hl_access";
export const REFRESH_TOKEN_COOKIE = "hl_refresh";
export const USER_COOKIE = "hl_user";

// Must match wp/plugin-headless/includes/class-tokens.php's REFRESH_TOKEN_TTL.
export const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

// `secure` requires HTTPS — conditional on NODE_ENV so local dev over
// plain HTTP still works (a browser silently drops a Secure cookie set
// over HTTP, which would otherwise break login in dev). Next sets
// NODE_ENV=development for `next dev` and production for a real build
// (including every Vercel environment, Preview and Production alike,
// both of which are always served over HTTPS) — not something this
// project sets itself.
const secure = process.env.NODE_ENV === "production";

export function accessTokenCookieOptions(maxAge: number) {
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge };
}

export function refreshTokenCookieOptions() {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  };
}

export function userCookieOptions() {
  return {
    httpOnly: false,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  };
}

// A deleting Set-Cookie must match the original cookie's `path` (and
// `domain`, unset here) to actually overwrite it — the secure/sameSite
// attributes don't have to match for deletion to take effect, but setting
// them identically removes any doubt rather than relying on the caller's
// own defaults matching ours.
export function expiredCookieOptions(httpOnly: boolean) {
  return { path: "/", maxAge: 0, secure, sameSite: "lax" as const, httpOnly };
}
