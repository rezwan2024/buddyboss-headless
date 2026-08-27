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
});

export type Group = z.infer<typeof groupSchema>;

export const groupListSchema = z.array(groupSchema);
