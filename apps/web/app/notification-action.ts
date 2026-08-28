"use server";

import { getAccessToken } from "@/lib/session";
import { markNotificationRead } from "@buddyboss-headless/api-client";

export type MarkNotificationReadResult = { ok: true } | { ok: false; error: string };

export async function markNotificationReadAction(id: number): Promise<MarkNotificationReadResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in." };

  try {
    await markNotificationRead(id, accessToken);
  } catch {
    return { ok: false, error: "Couldn't mark that read — try again." };
  }
  return { ok: true };
}
