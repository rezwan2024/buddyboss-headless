"use server";

import { REFRESH_TOKEN_COOKIE, clearSessionCookies, setSessionCookies } from "@/lib/session";
import { login as apiLogin, revokeToken } from "@buddyboss-headless/api-client";
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

  let tokens: Awaited<ReturnType<typeof apiLogin>>;
  try {
    tokens = await apiLogin(username, password);
  } catch {
    // Deliberately generic — matches the WP plugin's own generic error, so
    // failed logins never confirm whether a username exists.
    return { error: "Incorrect username or password." };
  }

  await setSessionCookies(tokens);
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) {
    await revokeToken(refreshToken);
  }
  await clearSessionCookies();
  redirect("/");
}
