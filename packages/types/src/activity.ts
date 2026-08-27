// Derived from docs/samples/buddyboss-v1-activity.json (see
// scripts/draft-schema.ts for the drafting tool). Trimmed to the fields the
// frontend actually renders — the real API response carries ~50 more fields
// per item (activity_data, bb_sharing, bp_media_ids, _links, ...).
//
// GENERATED — do not hand-edit field shapes without re-checking a live sample
// via ./scripts/introspect-api.ts; add fields as new screens need them.
import { z } from "zod";

// BuddyBoss serializes booleans and numbers inconsistently (true/false vs
// 0/1 vs "0"/"1" depending on endpoint and PHP code path) — coerce, don't trust.
//
// z.coerce.boolean() is a trap here: it does JS-truthy coercion, so the
// string "0" (falsy in PHP, truthy in JS) coerces to `true`. Treat "0"/""
// as false explicitly instead.
const looseBoolean = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? v !== "" && v !== "0" : Boolean(v)))
  .catch(false);
const looseNumber = z.coerce.number().catch(0);

export const activityAvatarSchema = z
  .object({
    full: z.string().catch(""),
    thumb: z.string().catch(""),
  })
  .catch({ full: "", thumb: "" });

export const activitySchema = z.object({
  id: looseNumber,
  user_id: looseNumber,
  name: z.string().catch(""),
  mention_name: z.string().catch(""),
  component: z.string().catch(""),
  type: z.string().catch(""),
  date: z.string(),
  link: z.string().catch(""),
  user_link: z.string().catch(""),
  user_avatar: activityAvatarSchema,
  title: z.string().catch(""),
  content: z.object({ rendered: z.string().catch("") }).catch({ rendered: "" }),
  content_stripped: z.string().catch(""),
  privacy: z.string().catch("public"),
  favorited: looseBoolean,
  can_favorite: looseBoolean,
  favorite_count: looseNumber,
  can_comment: looseBoolean,
  comment_count: looseNumber,
});

export type Activity = z.infer<typeof activitySchema>;

export const activityListSchema = z.array(activitySchema);
