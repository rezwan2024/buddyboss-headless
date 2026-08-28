"use server";

import { getAccessToken, getSessionUser } from "@/lib/session";
import {
  acceptFriendRequest,
  removeFriend,
  removeFriendRequest,
  sendFriendRequest,
} from "@buddyboss-headless/api-client";
import { revalidateTag } from "next/cache";

export type FriendshipResult = { ok: true } | { ok: false; error: string };

export async function sendFriendRequestAction(friendId: number): Promise<FriendshipResult> {
  const accessToken = await getAccessToken();
  const user = await getSessionUser();
  if (!accessToken || !user) return { ok: false, error: "You must be logged in to add friends." };

  try {
    await sendFriendRequest(user.id, friendId, accessToken);
  } catch {
    return { ok: false, error: "Couldn't send that request — try again." };
  }
  revalidateTag("members", "max");
  return { ok: true };
}

export async function acceptFriendRequestAction(friendshipId: number): Promise<FriendshipResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in." };

  try {
    await acceptFriendRequest(friendshipId, accessToken);
  } catch {
    return { ok: false, error: "Couldn't accept that request — try again." };
  }
  revalidateTag("members", "max");
  return { ok: true };
}

/** Also used to cancel a request you sent — see removeFriendRequest's doc comment. */
export async function declineFriendRequestAction(friendshipId: number): Promise<FriendshipResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in." };

  try {
    await removeFriendRequest(friendshipId, accessToken);
  } catch {
    return { ok: false, error: "Couldn't update that request — try again." };
  }
  revalidateTag("members", "max");
  return { ok: true };
}

export async function removeFriendAction(friendId: number): Promise<FriendshipResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in." };

  try {
    await removeFriend(friendId, accessToken);
  } catch {
    return { ok: false, error: "Couldn't remove that friend — try again." };
  }
  revalidateTag("members", "max");
  return { ok: true };
}
