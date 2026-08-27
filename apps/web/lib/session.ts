import type { TokenResponse } from "@buddyboss-headless/types";
import { cookies } from "next/headers";

// hl_access/hl_refresh are httpOnly — never readable by client JS. hl_user
// is deliberately NOT httpOnly: it's just display info (id/name), read
// client-side by <AuthStatus> so the header doesn't have to call
// cookies() server-side, which would force every route to render
// dynamically (losing ISR) the moment auth exists anywhere in the tree.
export const ACCESS_TOKEN_COOKIE = "hl_access";
export const REFRESH_TOKEN_COOKIE = "hl_refresh";
export const USER_COOKIE = "hl_user";

// Must match wp/plugin-headless/includes/class-tokens.php's REFRESH_TOKEN_TTL.
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

const secure = process.env.NODE_ENV === "production";

export interface SessionUser {
  id: number;
  name: string;
  mentionName: string;
}

/** Server Components only — the httpOnly access token, or null if not logged in. */
export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

/** Called from a Server Action or middleware — persists a fresh token pair. */
export async function setSessionCookies(tokens: TokenResponse): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.expires_in,
  });
  store.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  store.set(
    USER_COOKIE,
    // Next's cookie store already URI-encodes the value it's given (a raw
    // JSON string has characters — "{", '"', ":" — invalid in an unquoted
    // RFC 6265 cookie-value) — don't encode it again here, or <AuthStatus>'s
    // single decodeURIComponent leaves it double-encoded and JSON.parse fails.
    JSON.stringify({
      id: tokens.user.id,
      name: tokens.user.name,
      mentionName: tokens.user.mention_name,
    } satisfies SessionUser),
    { httpOnly: false, secure, sameSite: "lax", path: "/", maxAge: REFRESH_TOKEN_MAX_AGE },
  );
}

/**
 * Called from a Server Action — clears all session cookies (logout).
 *
 * Explicit `.set(name, "", { ...matching attributes, maxAge: 0 })` rather
 * than `.delete(name)`: a deleting Set-Cookie must match the original
 * cookie's `path` (and `domain`, unset here) to actually overwrite it — the
 * `secure`/`sameSite`/`httpOnly` attributes don't have to match for
 * deletion to take effect, but setting them identically here removes any
 * doubt rather than relying on `.delete()`'s own defaults matching ours.
 */
export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  const expired = { path: "/", maxAge: 0, secure, sameSite: "lax" as const };
  store.set(ACCESS_TOKEN_COOKIE, "", { ...expired, httpOnly: true });
  store.set(REFRESH_TOKEN_COOKIE, "", { ...expired, httpOnly: true });
  store.set(USER_COOKIE, "", { ...expired, httpOnly: false });
}
