// Derived from docs/samples/buddyboss-v1-activity.json (see
// scripts/draft-schema.ts for the drafting tool). Trimmed to the fields the
// frontend actually renders — the real API response carries ~50 more fields
// per item (activity_data, bb_sharing, bp_media_ids, _links, ...).
//
// GENERATED — do not hand-edit field shapes without re-checking a live sample
// via ./scripts/introspect-api.ts; add fields as new screens need them.
import { z } from "zod";
import { avatarUrlsSchema, looseBoolean, looseNumber } from "./shared";

// `reacted_names` comes back as the number 0 (no likes) or a comma-separated
// string of display names (who liked) when there's at least one.
const reactedNames = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? v : ""))
  .catch("");

export const activityAvatarSchema = avatarUrlsSchema;

const activityFieldsSchema = z.object({
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
  reacted_names: reactedNames,
  can_comment: looseBoolean,
  comment_count: looseNumber,
});

// A comment activity can carry its own replies under the same `comments` key
// it was itself nested under — recursive, arbitrary depth. z.lazy() defers
// evaluation of the self-reference until parse time, once `activitySchema`
// is actually bound.
export type Activity = z.infer<typeof activityFieldsSchema> & {
  comments?: Activity[];
};

export const activitySchema: z.ZodType<Activity, z.ZodTypeDef, unknown> =
  activityFieldsSchema.extend({
    comments: z
      .lazy(() => z.array(activitySchema))
      .optional()
      .catch(undefined),
  });

export const activityListSchema = z.array(activitySchema);

// GET /buddyboss/v1/activity/{id}/comment — comments have the same shape as
// an activity item (type: "activity_comment"), just nested under this envelope.
export const activityCommentsResponseSchema = z.object({
  comment_count: looseNumber,
  comments: z.array(activitySchema).catch([]),
});

export type ActivityCommentsResponse = z.infer<typeof activityCommentsResponseSchema>;
