"use server";

import { getAccessToken } from "@/lib/session";
import { createReply } from "@buddyboss-headless/api-client";
import { revalidateTag } from "next/cache";

export interface PostReplyState {
  error?: string;
  success?: boolean;
}

/**
 * Bound with `topicId` at the call site (`postReplyAction.bind(null,
 * topicId)`) so `useActionState` gets the `(prevState, formData)`
 * signature it expects while still knowing which topic to reply to.
 */
export async function postReplyAction(
  topicId: number,
  _prevState: PostReplyState,
  formData: FormData,
): Promise<PostReplyState> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { error: "You must be logged in to reply." };

  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Write something first." };

  try {
    await createReply(topicId, content, accessToken);
  } catch {
    return { error: "Couldn't post that reply — try again." };
  }

  revalidateTag("forums", "max");
  return { success: true };
}
