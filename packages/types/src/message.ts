// Derived from GET/POST /buddyboss/v1/messages and /messages/{id} — the
// same shape is returned by listing threads, fetching one thread, and
// sending/replying (confirmed live, not just from doc comments). One
// thread response embeds its own `messages[]` — there's no separate
// per-message endpoint to call.
import { z } from "zod";
import { looseNumber } from "./shared";

const renderedText = z.object({ rendered: z.string().catch("") }).catch({ rendered: "" });

const senderAvatarsSchema = z
  .object({ thumb: z.string().catch(""), full: z.string().catch("") })
  .catch({ thumb: "", full: "" });

export const messageItemSchema = z.object({
  id: looseNumber,
  thread_id: looseNumber,
  sender_id: looseNumber,
  message: renderedText,
  date_sent: z.string().catch(""),
  // Embedded directly on each message — no separate member lookup needed
  // to render a sender's name/avatar, unlike forum topics/replies.
  sender_data: z
    .object({ sender_name: z.string().catch(""), user_avatars: senderAvatarsSchema })
    .catch({ sender_name: "", user_avatars: { thumb: "", full: "" } }),
});

export type MessageItem = z.infer<typeof messageItemSchema>;

const threadRecipientSchema = z.object({
  user_id: looseNumber,
  name: z.string().catch(""),
  user_avatars: senderAvatarsSchema,
});

// Keyed by user id (as a string) — confirmed live, e.g. `{"25": {...}}`.
const threadRecipientsSchema = z.record(z.string(), threadRecipientSchema).catch({});

export const threadSchema = z.object({
  id: looseNumber,
  message_id: looseNumber,
  last_sender_id: looseNumber,
  subject: renderedText,
  excerpt: renderedText,
  date: z.string().catch(""),
  unread_count: looseNumber,
  recipients: threadRecipientsSchema,
  // Only the list endpoint's items are missing this in principle — in
  // practice BuddyBoss embeds the same `messages[]` on every response
  // shape here (list items included), confirmed live.
  messages: z.array(messageItemSchema).catch([]),
});

export type Thread = z.infer<typeof threadSchema>;

export const threadListSchema = z.array(threadSchema);

// GET /buddyboss/v1/messages/search-thread — confirmed live: `[]` (a bare
// empty array) when no thread exists with that recipient yet, or the full
// thread object (same shape as everything else here) when one does.
// Normalized to `Thread | null` so callers don't special-case the array.
export const findThreadResponseSchema = z
  .union([z.array(z.unknown()).length(0), threadSchema])
  .transform((v) => (Array.isArray(v) ? null : v));
