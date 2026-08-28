// Derived from GET /buddyboss/v1/members. Trimmed to what the directory and
// profile screens render — the real response also carries gamification and
// _links, skipped here.
import { z } from "zod";
import { avatarUrlsSchema, looseBoolean, looseNumber } from "./shared";

// avatarUrlsSchema already has its own `.catch()` applied (a ZodCatch, not
// a plain ZodObject), which doesn't expose `.extend()` — build the
// member-detail variant (same shape plus `is_default`) as its own schema
// instead of trying to extend the shared one.
const memberAvatarUrlsSchema = z
  .object({
    full: z.string().catch(""),
    thumb: z.string().catch(""),
    // Confirmed live: `true` when the avatar is the BuddyBoss placeholder,
    // not a real uploaded photo — exactly what "complete your profile"
    // needs, no separate check required.
    is_default: looseBoolean,
  })
  .catch({ full: "", thumb: "", is_default: true });

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

// A field the member has actually filled in — confirmed live: unfilled
// fields (required or not) are omitted from this per-member response
// entirely, not present with an empty value. Cross-reference against
// `/xprofile/groups?fetch_fields=1` (see xprofile.ts) to know the full
// set of fields that *could* be filled, for a completeness calculation.
const memberXProfileFieldSchema = z.object({
  name: z.string().catch(""),
  value: z.object({ raw: z.string().catch("") }).catch({ raw: "" }),
});
const memberXProfileGroupSchema = z.object({
  name: z.string().catch(""),
  // Confirmed live: a group with no filled fields omits `fields` entirely
  // rather than sending an empty object.
  fields: z.record(z.string(), memberXProfileFieldSchema).catch({}),
});
const memberXProfileSchema = z
  .object({
    groups: z.record(z.string(), memberXProfileGroupSchema).catch({}),
  })
  .catch({ groups: {} });

// GET /buddyboss/v1/members/{id} — same core fields as the list, plus a
// cover image and xprofile (custom profile fields, used for the "complete
// your profile" sidebar — see lib/profile-completeness.ts). Also carries
// gamification, skipped here.
export const memberDetailSchema = memberSchema.extend({
  avatar_urls: memberAvatarUrlsSchema,
  cover_url: z.string().catch(""),
  cover_is_default: looseBoolean,
  xprofile: memberXProfileSchema,
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
