// Derived from GET /buddyboss/v1/members. Trimmed to what the directory and
// profile screens render — the real response also carries xprofile (a
// separate call is used for that per-profile), gamification, and _links.
import { z } from "zod";
import { avatarUrlsSchema, looseBoolean, looseNumber } from "./shared";

export const memberSchema = z.object({
  id: looseNumber,
  name: z.string().catch(""),
  user_login: z.string().catch(""),
  mention_name: z.string().catch(""),
  link: z.string().catch(""),
  registered_date: z.string().catch(""),
  last_activity: z.string().catch(""),
  avatar_urls: avatarUrlsSchema,
  is_wp_admin: looseBoolean,
});

export type Member = z.infer<typeof memberSchema>;

export const memberListSchema = z.array(memberSchema);

// GET /buddyboss/v1/members/{id} — same core fields as the list, plus a
// cover image. Also carries xprofile (custom profile fields), skipped here;
// add it when a screen needs it.
export const memberDetailSchema = memberSchema.extend({
  cover_url: z.string().catch(""),
  // Per-user friendship state between the current viewer and this member —
  // only meaningful on an authenticated request; an anonymous read still
  // gets these keys, just always "not_friends"/0/false. Unlike the groups
  // single-item endpoint (see DECISIONS.md for that bug), this one was
  // confirmed live to resolve the current user correctly, so no
  // list-endpoint workaround is needed here.
  friendship_status: z
    .enum(["not_friends", "pending", "awaiting_response", "is_friend"])
    .catch("not_friends"),
  friendship_id: looseNumber,
  create_friendship: looseBoolean,
});

export type MemberDetail = z.infer<typeof memberDetailSchema>;
