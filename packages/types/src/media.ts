// Media/video/document attachment flow is two calls: raw upload, then bind
// to an activity. Shapes confirmed against the actual plugin source
// (bp-media/bp-video/bp-document REST endpoints) — no live sample on disk
// since these are write-only routes `introspect-api.ts` never touches.
import { z } from "zod";
import { looseNumber } from "./shared";

// POST /{media,video}/upload — `upload_id` is a WP attachment post ID, not
// yet a BuddyBoss media/video ID.
export const mediaUploadSchema = z.object({
  upload_id: looseNumber,
  upload: z.string().catch(""),
  upload_thumb: z.string().catch(""),
  name: z.string().catch(""),
});
export type MediaUpload = z.infer<typeof mediaUploadSchema>;

// POST /document/upload — same idea, but the raw-upload response uses `id`
// instead of `upload_id` (confirmed against the live API; not what the
// plugin's own `@apiParam` docs implied).
export const documentUploadSchema = z.object({
  id: looseNumber,
  name: z.string().catch(""),
});
export type DocumentUpload = z.infer<typeof documentUploadSchema>;

// POST /media, /video, /document — binds an already-uploaded file to an
// activity. BuddyBoss auto-creates its own new "container" activity to
// host each attachment (there is no working way to attach a file to an
// activity the caller already created — see DECISIONS.md); `activity_id`
// here is that container's ID, not one the caller supplied.
const attachedItemSchema = z.object({ id: looseNumber, activity_id: looseNumber });

// media/video return an array (per file uploaded in the request); document
// returns a single object instead — asymmetric, confirmed against the live
// API. Normalize both to an array so callers don't need to special-case it.
export const mediaAttachSchema = z
  .union([attachedItemSchema, z.array(attachedItemSchema)])
  .transform((v) => (Array.isArray(v) ? v : [v]));
