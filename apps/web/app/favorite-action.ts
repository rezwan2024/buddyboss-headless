"use server";

import { getAccessToken } from "@/lib/session";
import { toggleActivityFavorite } from "@buddyboss-headless/api-client";
import { revalidateTag } from "next/cache";

export type ToggleFavoriteResult =
  | { ok: true; favorited: boolean; favoriteCount: number }
  | { ok: false; error: string };

/**
 * Called directly (not via a `<form action>`) from a plain button click —
 * see activity-feed-list.tsx's `LikeToggle` for why: this codebase already
 * learned the hard way (see git history on auth-status.tsx) that updating
 * client state before an action's promise resolves can race a native form
 * submission. There's no form here, but the same discipline applies: the
 * caller only updates its query cache after this resolves.
 */
export async function toggleFavoriteAction(activityId: number): Promise<ToggleFavoriteResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in to like this." };

  try {
    const activity = await toggleActivityFavorite(activityId, accessToken);
    revalidateTag("activity", "max");
    return { ok: true, favorited: activity.favorited, favoriteCount: activity.favorite_count };
  } catch {
    return { ok: false, error: "Couldn't update that — try again." };
  }
}
