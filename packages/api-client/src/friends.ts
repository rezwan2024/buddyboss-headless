import { WpApiError, wpFetchJson } from "./wp-fetch";

/**
 * Send a friend request — `POST /buddyboss/v1/friends`. Both IDs are
 * required by the endpoint (not inferred from the token) — confirmed live.
 * Returns the created friendship's id, used later to cancel/accept it.
 */
export async function sendFriendRequest(
  currentUserId: number,
  friendId: number,
  accessToken: string,
): Promise<number> {
  const friendship = await wpFetchJson("/buddyboss/v1/friends", (body) => body as { id: number }, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initiator_id: currentUserId, friend_id: friendId }),
    accessToken,
    cache: "no-store",
  });
  return friendship.id;
}

/**
 * Accept a pending friend request — `PATCH /buddyboss/v1/friends/{id}`, no
 * body. Confirmed live: the underlying `friends_accept_friendship()` call
 * verifies the current user is actually the recipient and 404s
 * (`bp_rest_friends_cannot_update_item`) otherwise — safe to call without
 * a redundant check on our side.
 */
export async function acceptFriendRequest(
  friendshipId: number,
  accessToken: string,
): Promise<void> {
  await wpFetchJson(`/buddyboss/v1/friends/${friendshipId}`, (body) => body, {
    method: "PATCH",
    accessToken,
    cache: "no-store",
  });
}

/**
 * Cancel a request you sent, or decline one you received — both go
 * through `DELETE /buddyboss/v1/friends/{id}`. The server picks the verb
 * based on whether the caller is the friendship's initiator (confirmed
 * live via the withdraw path); there's no separate "reject" endpoint.
 */
export async function removeFriendRequest(
  friendshipId: number,
  accessToken: string,
): Promise<void> {
  await wpFetchJson(`/buddyboss/v1/friends/${friendshipId}`, (body) => body, {
    method: "DELETE",
    accessToken,
    cache: "no-store",
  });
}

/**
 * Remove an already-accepted friendship — `DELETE /buddyboss/v1/friends?
 * friend_id={id}` (the *collection* route, unlike cancel/decline above,
 * which use the singular `/friends/{friendship_id}`). Confirmed live: this
 * endpoint returns HTTP 200 even on failure (e.g. no accepted friendship
 * exists) — the real result is the `unfriend` field in the body, `true`
 * on success or an error object otherwise. `wpFetchJson`'s `res.ok` check
 * doesn't catch this, so check the body explicitly here.
 */
export async function removeFriend(friendId: number, accessToken: string): Promise<void> {
  const body = await wpFetchJson(
    `/buddyboss/v1/friends?friend_id=${friendId}`,
    (b) => b as { unfriend: unknown },
    { method: "DELETE", accessToken, cache: "no-store" },
  );
  if (body.unfriend !== true) {
    throw new WpApiError("Failed to remove friend", 200, "/buddyboss/v1/friends");
  }
}
