import {
  findThreadResponseSchema,
  threadListSchema,
  threadSchema,
} from "@buddyboss-headless/types";
import type { Thread } from "@buddyboss-headless/types";
import { WpApiError, wpFetch, wpFetchJson } from "./wp-fetch";

export interface ThreadList {
  items: Thread[];
  total: number;
  pages: number;
  /** From the `bbp-unread-messages` response header — the inbox-wide unread badge count, not any one thread's. */
  unreadCount: number;
}

export interface GetThreadsParams {
  page?: number;
  perPage?: number;
  box?: "inbox" | "sentbox" | "starred";
}

/**
 * Thread list — `GET /buddyboss/v1/messages`. Requires auth; `user_id` is
 * a required param (confirmed live) — pass the current user's own id, not
 * a lookup target. Always `no-store`: this is inherently per-user data,
 * unlike most other list endpoints in this project.
 */
export async function getThreads(
  userId: number,
  accessToken: string,
  params: GetThreadsParams = {},
): Promise<ThreadList> {
  const query = new URLSearchParams({
    user_id: String(userId),
    box: params.box ?? "inbox",
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
  });
  const path = `/buddyboss/v1/messages?${query}`;
  const res = await wpFetch(path, { accessToken, cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new WpApiError(`BuddyBoss API ${res.status} for ${path}`, res.status, path);
  }
  const items = threadListSchema.parse(body);
  return {
    items,
    total: Number(res.headers.get("x-wp-total") ?? items.length),
    pages: Number(res.headers.get("x-wp-totalpages") ?? 1),
    unreadCount: Number(res.headers.get("bbp-unread-messages") ?? 0),
  };
}

/**
 * A single thread with its messages — `GET /buddyboss/v1/messages/{id}`.
 * `id` here is the *thread* id, not a message id (the response embeds all
 * of that thread's `messages[]`) — confirmed live. Doesn't mark it read;
 * see `markThreadRead`.
 */
export async function getThread(threadId: number, accessToken: string): Promise<Thread> {
  return wpFetchJson(`/buddyboss/v1/messages/${threadId}`, (body) => threadSchema.parse(body), {
    accessToken,
    cache: "no-store",
  });
}

/**
 * Find an existing thread with a given recipient — `GET
 * /buddyboss/v1/messages/search-thread`. `sendNewThread` has no built-in
 * dedup (confirmed live: sending "new" recipients that already share a
 * thread creates a second, separate one) — call this first from a
 * "Message" button on a profile to route into the existing conversation
 * instead of creating a duplicate.
 */
export async function findThreadWithRecipient(
  recipientId: number,
  accessToken: string,
): Promise<Thread | null> {
  return wpFetchJson(
    `/buddyboss/v1/messages/search-thread?recipient_id=${recipientId}`,
    (body) => findThreadResponseSchema.parse(body),
    { accessToken, cache: "no-store" },
  );
}

/**
 * Start a new thread — `POST /buddyboss/v1/messages` with `recipients`
 * (always an array, even for a 1:1 message — confirmed live) and no `id`.
 * Check `findThreadWithRecipient` first — see its doc comment.
 */
export async function sendNewThread(
  recipientIds: number[],
  message: string,
  accessToken: string,
): Promise<Thread> {
  return wpFetchJson("/buddyboss/v1/messages", (body) => threadSchema.parse(body), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipients: recipientIds, message }),
    accessToken,
    cache: "no-store",
  });
}

/**
 * Reply to an existing thread — same route as `sendNewThread`, but with
 * `id` (the thread id) instead of `recipients` — confirmed live, there's
 * no separate reply endpoint.
 */
export async function replyToThread(
  threadId: number,
  message: string,
  accessToken: string,
): Promise<Thread> {
  return wpFetchJson("/buddyboss/v1/messages", (body) => threadSchema.parse(body), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: threadId, message }),
    accessToken,
    cache: "no-store",
  });
}

/**
 * Mark a thread read — `POST /buddyboss/v1/messages/action/{id}` with
 * `{action: "unread", value: false}`. Counter-intuitive but confirmed
 * live: `value: false` on the `"unread"` action marks the thread *read*;
 * `value: true` marks it unread. GET-ing a thread does not mark it read
 * on its own.
 */
export async function markThreadRead(threadId: number, accessToken: string): Promise<void> {
  await wpFetchJson(`/buddyboss/v1/messages/action/${threadId}`, (body) => body, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unread", value: false }),
    accessToken,
    cache: "no-store",
  });
}
