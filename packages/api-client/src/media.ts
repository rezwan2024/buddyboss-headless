import {
  documentUploadSchema,
  mediaAttachSchema,
  mediaUploadSchema,
} from "@buddyboss-headless/types";
import { wpFetchJson } from "./wp-fetch";

/**
 * Step 1 of posting a photo/video — raw multipart upload,
 * `POST /buddyboss/v1/{media,video}/upload`. The returned `upload_id` is a
 * WP attachment post ID, not yet a BuddyBoss media/video ID — pass it into
 * `attachMediaOrVideo` to actually turn it into an activity post.
 */
export async function uploadFile(kind: "media" | "video", file: File, accessToken: string) {
  const form = new FormData();
  form.append("file", file);
  return wpFetchJson(`/buddyboss/v1/${kind}/upload`, (body) => mediaUploadSchema.parse(body), {
    method: "POST",
    body: form,
    accessToken,
    cache: "no-store",
  });
}

/**
 * Document's raw-upload step — same idea as `uploadFile`, but
 * `POST /buddyboss/v1/document/upload` returns `id` instead of
 * `upload_id` (confirmed against the live API; asymmetric with
 * media/video), so it gets its own function and schema.
 */
export async function uploadDocument(file: File, accessToken: string) {
  const form = new FormData();
  form.append("file", file);
  return wpFetchJson("/buddyboss/v1/document/upload", (body) => documentUploadSchema.parse(body), {
    method: "POST",
    body: form,
    accessToken,
    cache: "no-store",
  });
}

/**
 * Step 2 for photos/videos — `POST /buddyboss/v1/media` or `/video`, which
 * turns an uploaded file into an activity post. BuddyBoss always creates a
 * *new* activity to host it — there's no supported way to attach a file to
 * an activity the caller already created (see DECISIONS.md for how this
 * was confirmed against the live API). The returned item's `activity_id`
 * is that new activity's ID; the caller can `PATCH` it afterward (e.g. to
 * add caption text).
 *
 * Pass `groupId` to post into a group's stream instead — confirmed live
 * this endpoint takes a `group_id` param (a different name from
 * `createActivity`'s `component`/`primary_item_id` pair for the same idea).
 */
export async function attachMediaOrVideo(
  kind: "media" | "video",
  uploadId: number,
  accessToken: string,
  groupId?: number,
) {
  const [item] = await wpFetchJson(
    `/buddyboss/v1/${kind}`,
    (body) => mediaAttachSchema.parse(body),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_ids: [uploadId],
        privacy: "public",
        ...(groupId ? { group_id: groupId } : {}),
      }),
      accessToken,
      cache: "no-store",
    },
  );
  return item;
}

/**
 * Step 2 for documents — same idea, but `POST /buddyboss/v1/document` takes
 * `document_ids` instead of `upload_ids`. Same `group_id` scoping param as
 * `attachMediaOrVideo`, confirmed live.
 */
export async function attachDocument(uploadId: number, accessToken: string, groupId?: number) {
  const [item] = await wpFetchJson(
    "/buddyboss/v1/document",
    (body) => mediaAttachSchema.parse(body),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_ids: [uploadId],
        privacy: "public",
        ...(groupId ? { group_id: groupId } : {}),
      }),
      accessToken,
      cache: "no-store",
    },
  );
  return item;
}
