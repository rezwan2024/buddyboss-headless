"use server";

import { checkRateLimit, getClientIp, recordFailure, recordSuccess } from "@/lib/rate-limit";
import { REFRESH_TOKEN_COOKIE, clearSessionCookies, setSessionCookies } from "@/lib/session";
import {
  type SignUpFieldErrors,
  SignUpValidationError,
  login as apiLogin,
  revokeToken,
  signUp,
} from "@buddyboss-headless/api-client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Enter a username and password." };
  }

  // Per-IP, not per-username — a brute-force attempt guesses many
  // usernames from one source, and limiting per-username alone wouldn't
  // slow that down. Checked before attempting auth so a limited request
  // never even reaches WordPress. Keyed separately from signupAction's
  // rate limit — different risk profiles, one shouldn't lock out the
  // other.
  const ip = await getClientIp();
  const rateLimitKey = `login:${ip}`;
  const rateLimit = checkRateLimit(rateLimitKey);
  if (rateLimit.limited) {
    const minutes = Math.ceil(rateLimit.retryAfterSeconds / 60);
    return {
      error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  let tokens: Awaited<ReturnType<typeof apiLogin>>;
  try {
    tokens = await apiLogin(username, password);
  } catch {
    recordFailure(rateLimitKey);
    // Deliberately generic — matches the WP plugin's own generic error, so
    // failed logins never confirm whether a username exists.
    return { error: "Incorrect username or password." };
  }

  recordSuccess(rateLimitKey);
  await setSessionCookies(tokens);
  redirect("/");
}

export interface SignUpState {
  error?: string;
  fieldErrors?: SignUpFieldErrors;
}

/**
 * Creates the account, then immediately logs in with the same
 * credentials — confirmed live that a fresh signup needs no email
 * activation on this install (see `signUp`'s doc comment) — rather than
 * sending the user back to a separate login screen right after they just
 * filled in a password.
 */
export async function signupAction(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();

  if (!email || !password || !firstName || !lastName || !username) {
    return { error: "Fill in every field." };
  }

  // Same per-IP scheme as loginAction, own key — see its comment.
  const ip = await getClientIp();
  const rateLimitKey = `signup:${ip}`;
  const rateLimit = checkRateLimit(rateLimitKey);
  if (rateLimit.limited) {
    const minutes = Math.ceil(rateLimit.retryAfterSeconds / 60);
    return {
      error: `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  try {
    await signUp({ email, password, firstName, lastName, username });
  } catch (err) {
    recordFailure(rateLimitKey);
    if (err instanceof SignUpValidationError) {
      return { fieldErrors: err.fieldErrors };
    }
    return { error: "Couldn't create your account — try again." };
  }

  let tokens: Awaited<ReturnType<typeof apiLogin>>;
  try {
    tokens = await apiLogin(username, password);
  } catch {
    // The account was created successfully — this would only fail on a
    // transient network hiccup right after, not bad credentials (we just
    // set them ourselves). Send them to log in manually rather than
    // claiming signup itself failed.
    recordSuccess(rateLimitKey);
    redirect("/login");
  }

  recordSuccess(rateLimitKey);
  await setSessionCookies(tokens);
  redirect("/");
}

/**
 * No redirect() here, deliberately — unlike loginAction, this always runs
 * from a page the user is already on ("/" via the header), so there's no
 * new page to navigate to. <AuthStatus> calls this directly (not via a
 * plain `<form action>`) so it can safely update its own state and call
 * router.refresh() after the cookies are actually cleared, instead of
 * racing a native form submission against a synchronous state update that
 * unmounts the form mid-submission (see its comment for what that looked
 * like when it broke).
 */
export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    await revokeToken(refreshToken);
  }
  await clearSessionCookies();
}
