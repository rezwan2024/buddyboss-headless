"use server";

import { getAccessToken } from "@/lib/session";
import { createTopic } from "@buddyboss-headless/api-client";
import { revalidateTag } from "next/cache";

export interface PostTopicState {
  error?: string;
  success?: boolean;
  topicId?: number;
}

/**
 * Bound with `forumId` at the call site (`postTopicAction.bind(null,
 * forumId)`) so `useActionState` gets the `(prevState, formData)` signature
 * it expects while still knowing which forum to post into.
 */
export async function postTopicAction(
  forumId: number,
  _prevState: PostTopicState,
  formData: FormData,
): Promise<PostTopicState> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { error: "You must be logged in to post." };

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  if (!title) return { error: "Give it a subject." };
  if (!content) return { error: "Write something first." };

  let topicId: number;
  try {
    const topic = await createTopic(forumId, title, content, accessToken);
    topicId = topic.id;
  } catch {
    return { error: "Couldn't post that — try again." };
  }

  revalidateTag("forums", "max");
  return { success: true, topicId };
}
