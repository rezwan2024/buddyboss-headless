import { tokenResponseSchema } from "@buddyboss-headless/types";
import type { TokenResponse } from "@buddyboss-headless/types";
import { wpFetchJson } from "./wp-fetch";

/**
 * POST headless-auth/v1/login — exchanges username/password for an
 * access/refresh token pair. Throws `WpApiError` (status 401) on bad
 * credentials; callers should catch that specifically to show a login
 * error rather than a generic failure.
 */
export async function login(username: string, password: string): Promise<TokenResponse> {
  return wpFetchJson("/headless-auth/v1/login", (body) => tokenResponseSchema.parse(body), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
}

/** POST headless-auth/v1/refresh — rotates a refresh token for a new access/refresh pair. */
export async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  return wpFetchJson("/headless-auth/v1/refresh", (body) => tokenResponseSchema.parse(body), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: "no-store",
  });
}

/**
 * POST headless-auth/v1/revoke — invalidates a refresh token (logout).
 * Never throws: the caller clears the session cookies regardless of
 * whether WP could be reached, so a network hiccup here shouldn't block
 * logging out.
 */
export async function revokeToken(refreshToken: string): Promise<void> {
  try {
    await wpFetchJson("/headless-auth/v1/revoke", (body) => body, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
  } catch {
    // swallow — see doc comment
  }
}
