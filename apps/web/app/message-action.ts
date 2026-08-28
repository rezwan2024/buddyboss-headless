"use server";

import { getAccessToken } from "@/lib/session";
import {
  findThreadWithRecipient,
  replyToThread,
  sendNewThread,
} from "@buddyboss-headless/api-client";
import { revalidateTag } from "next/cache";

export type StartConversationResult =
  | { ok: true; threadId: number }
  | { ok: true; threadId: null; recipientId: number }
  | { ok: false; error: string };

/**
 * Called from the "Message" button on a profile — finds an existing
 * thread with this recipient first (there's no server-side dedup on
 * send, see `findThreadWithRecipient`'s doc comment), so the caller can
 * route straight into it instead of starting a duplicate conversation.
 * `threadId: null` means "no thread yet — go compose the first message."
 */
export async function startConversationAction(
  recipientId: number,
): Promise<StartConversationResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in to send messages." };

  try {
    const existing = await findThreadWithRecipient(recipientId, accessToken);
    return existing
      ? { ok: true, threadId: existing.id }
      : { ok: true, threadId: null, recipientId };
  } catch {
    return { ok: false, error: "Couldn't check for an existing conversation — try again." };
  }
}

export interface SendNewThreadState {
  error?: string;
  success?: boolean;
  threadId?: number;
}

/** Bound with `recipientId` at the call site — see topic-action.ts for why. */
export async function sendNewThreadAction(
  recipientId: number,
  _prevState: SendNewThreadState,
  formData: FormData,
): Promise<SendNewThreadState> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { error: "You must be logged in to send messages." };

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Write something first." };

  try {
    const thread = await sendNewThread([recipientId], message, accessToken);
    revalidateTag("messages", "max");
    return { success: true, threadId: thread.id };
  } catch {
    return { error: "Couldn't send that — try again." };
  }
}

export interface SendReplyState {
  error?: string;
  success?: boolean;
}

/** Bound with `threadId` at the call site — see topic-action.ts for why. */
export async function sendReplyAction(
  threadId: number,
  _prevState: SendReplyState,
  formData: FormData,
): Promise<SendReplyState> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { error: "You must be logged in to reply." };

  const message = String(formData.get("message") ?? "").trim();
  if (!message) return { error: "Write something first." };

  try {
    await replyToThread(threadId, message, accessToken);
  } catch {
    return { error: "Couldn't send that — try again." };
  }
  revalidateTag("messages", "max");
  return { success: true };
}
