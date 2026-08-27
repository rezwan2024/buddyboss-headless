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

// A photo attached to the post (not the same thing as a feature image —
// this is BuddyBoss Media, a separate attachment with its own sizes).
const activityMediaItemSchema = z.object({
  id: looseNumber,
  attachment_data: z
    .object({
      full: z.string().catch(""),
      activity_thumb: z.string().catch(""),
    })
    .catch({ full: "", activity_thumb: "" }),
});

// `bp_media_ids` is `null` when nothing's attached, otherwise an array —
// never an empty array in practice, but treat it the same as null either way.
const bpMediaIds = z
  .array(activityMediaItemSchema)
  .nullable()
  .catch(null)
  .transform((v) => (v && v.length > 0 ? v : null));

// Same null-or-array shape as bp_media_ids, confirmed against a live post
// (see DECISIONS.md — attaching a video always creates its own activity, so
// this is what that activity looks like fetched back).
const bpVideos = z
  .array(activityMediaItemSchema)
  .nullable()
  .catch(null)
  .transform((v) => (v && v.length > 0 ? v : null));

// A document attached to the post. Confirmed against a live post — unlike
// media/video, there's no thumbnail image; just filename/size/extension.
const activityDocumentItemSchema = z.object({
  id: looseNumber,
  filename: z.string().catch(""),
  size: z.string().catch(""),
  extension: z.string().catch(""),
  download_url: z.string().catch(""),
});
const bpDocuments = z
  .array(activityDocumentItemSchema)
  .nullable()
  .catch(null)
  .transform((v) => (v && v.length > 0 ? v : null));

// `bb_activity_post_feature_image` is `[]` (empty array) when unset, or an
// object when a feature image is attached to a text post.
const featureImageObjectSchema = z.object({
  url: z.string().catch(""),
  medium: z.string().catch(""),
  thumb: z.string().catch(""),
});
const bbActivityPostFeatureImage = z
  .union([z.array(z.unknown()), featureImageObjectSchema])
  .catch([])
  .transform((v) => (Array.isArray(v) ? null : v));

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
  bp_media_ids: bpMediaIds,
  bp_videos: bpVideos,
  bp_documents: bpDocuments,
  bb_activity_post_feature_image: bbActivityPostFeatureImage,
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

// POST /buddyboss/v1/activity — the fields this project's composer actually
// reads back from a created activity (just enough to attach media next).
export const activityCreateResponseSchema = z.object({ id: looseNumber });
export type ActivityCreateResponse = z.infer<typeof activityCreateResponseSchema>;
