// Derived from GET /buddyboss/v1/groups and /buddyboss/v1/groups/{id} — both
// return the same shape, so one schema covers list and detail.
import { z } from "zod";
import { avatarUrlsSchema, looseBoolean, looseNumber } from "./shared";

export const groupSchema = z.object({
  id: looseNumber,
  name: z.string().catch(""),
  slug: z.string().catch(""),
  description: z.object({ rendered: z.string().catch("") }).catch({ rendered: "" }),
  status: z.string().catch("public"),
  last_activity: z.string().catch(""),
  members_count: looseNumber,
  group_type_label: z.string().catch(""),
  enable_forum: looseBoolean,
  avatar_urls: avatarUrlsSchema,
  cover_url: z.string().catch(""),
  // Per-user membership fields — only meaningful on an authenticated
  // request (see getGroup's accessToken param); an anonymous read still
  // gets these keys, just always false/0. `request_id`/`invite_id` come
  // back as the boolean `false` (not `0`) when unset, confirmed live —
  // looseNumber coerces that the same as a real 0.
  is_member: looseBoolean,
  can_join: looseBoolean,
  request_id: looseNumber,
});

export type Group = z.infer<typeof groupSchema>;

export const groupListSchema = z.array(groupSchema);
