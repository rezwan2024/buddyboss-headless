"use server";

import { getAccessToken } from "@/lib/session";
import { createActivityComment } from "@buddyboss-headless/api-client";
import { revalidateTag } from "next/cache";

export interface PostCommentState {
  error?: string;
  success?: boolean;
}

/**
 * Bound with `activityId` at the call site (`postCommentAction.bind(null,
 * activityId)`) so `useActionState` gets the `(prevState, formData)`
 * signature it expects while still knowing which activity to comment on.
 */
export async function postCommentAction(
  activityId: number,
  _prevState: PostCommentState,
  formData: FormData,
): Promise<PostCommentState> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { error: "You must be logged in to comment." };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Write something first." };

  try {
    await createActivityComment(activityId, content, accessToken);
  } catch {
    return { error: "Couldn't post that comment — try again." };
  }

  // getActivityComments/getActivityFeed both use `next: { tags: ["activity"] }`
  // — without this, the client's post-success refetch (see
  // activity-comments.tsx) would just re-read Next's own stale cached
  // response instead of the comment that was just posted.
  revalidateTag("activity", "max");
  return { success: true };
}
