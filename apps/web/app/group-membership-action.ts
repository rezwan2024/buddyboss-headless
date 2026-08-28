"use server";

import { getAccessToken, getSessionUser } from "@/lib/session";
import {
  cancelGroupMembershipRequest,
  joinGroup,
  leaveGroup,
  requestGroupMembership,
} from "@buddyboss-headless/api-client";
import { revalidateTag } from "next/cache";

export type GroupMembershipResult = { ok: true } | { ok: false; error: string };

/**
 * Called directly from a button click (not a `<form action>`) via
 * `useTransition`, same pattern as `favorite-action.ts` — wait for the
 * result before the caller does anything to its UI.
 */
export async function joinGroupAction(groupId: number): Promise<GroupMembershipResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in to join." };

  try {
    await joinGroup(groupId, accessToken);
  } catch {
    return { ok: false, error: "Couldn't join that group — try again." };
  }
  revalidateTag("groups", "max");
  return { ok: true };
}

export async function leaveGroupAction(groupId: number): Promise<GroupMembershipResult> {
  const accessToken = await getAccessToken();
  const user = await getSessionUser();
  if (!accessToken || !user) return { ok: false, error: "You must be logged in to leave." };

  try {
    await leaveGroup(groupId, user.id, accessToken);
  } catch {
    return { ok: false, error: "Couldn't leave that group — try again." };
  }
  revalidateTag("groups", "max");
  return { ok: true };
}

export async function requestGroupMembershipAction(
  groupId: number,
): Promise<GroupMembershipResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in to request membership." };

  try {
    await requestGroupMembership(groupId, accessToken);
  } catch {
    return { ok: false, error: "Couldn't send that request — try again." };
  }
  revalidateTag("groups", "max");
  return { ok: true };
}

export async function cancelGroupMembershipRequestAction(
  requestId: number,
): Promise<GroupMembershipResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in." };

  try {
    await cancelGroupMembershipRequest(requestId, accessToken);
  } catch {
    return { ok: false, error: "Couldn't cancel that request — try again." };
  }
  revalidateTag("groups", "max");
  return { ok: true };
}
