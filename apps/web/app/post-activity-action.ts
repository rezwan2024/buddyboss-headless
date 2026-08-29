"use server";

import { getAccessToken } from "@/lib/session";
import {
  attachDocument,
  attachMediaOrVideo,
  createActivity,
  setActivityContent,
  uploadDocument,
  uploadFile,
} from "@buddyboss-headless/api-client";
import { revalidateTag } from "next/cache";

export interface PostActivityState {
  error?: string;
  success?: boolean;
}

function firstNonEmptyFile(formData: FormData, field: string): File | null {
  const file = formData.get(field);
  return file instanceof File && file.size > 0 ? file : null;
}

/**
 * `groupId` is bound in by the caller (`ActivityComposer`) via
 * `.bind(null, groupId)` before being passed to `useActionState` — same
 * pattern `comment-action.ts` uses to parametrize an action by the activity
 * it's attached to. Omit (or pass `undefined`) to post to the general feed;
 * pass a group's id to post into that group's stream instead.
 */
export async function postActivityAction(
  groupId: number | undefined,
  _prevState: PostActivityState,
  formData: FormData,
): Promise<PostActivityState> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { error: "You must be logged in to post." };

  const content = String(formData.get("content") ?? "").trim();
  const image = firstNonEmptyFile(formData, "image");
  const video = firstNonEmptyFile(formData, "video");
  const document = firstNonEmptyFile(formData, "document");
  const attachments = [image, video, document].filter(Boolean);

  if (!content && attachments.length === 0) {
    return { error: "Write something or attach a file." };
  }
  // BuddyBoss has no supported way to attach more than one file to a single
  // activity via the REST API on this install — each attach call creates
  // its own new activity (confirmed against the live API; see
  // DECISIONS.md). Rather than silently post extra, uncaptioned duplicate
  // activities, require one attachment per post for now.
  if (attachments.length > 1) {
    return { error: "Attach one photo, video, or document at a time for now." };
  }

  try {
    if (image) {
      const upload = await uploadFile("media", image, accessToken);
      const media = await attachMediaOrVideo("media", upload.upload_id, accessToken, groupId);
      if (content) await setActivityContent(media.activity_id, content, accessToken);
    } else if (video) {
      const upload = await uploadFile("video", video, accessToken);
      const created = await attachMediaOrVideo("video", upload.upload_id, accessToken, groupId);
      if (content) await setActivityContent(created.activity_id, content, accessToken);
    } else if (document) {
      const upload = await uploadDocument(document, accessToken);
      const created = await attachDocument(upload.id, accessToken, groupId);
      if (content) await setActivityContent(created.activity_id, content, accessToken);
    } else {
      await createActivity(content, accessToken, groupId);
    }
  } catch {
    return { error: "Couldn't post that — try again." };
  }

  // Keeps the anonymous, ISR-cached feed (tags: ["activity"]) in sync too —
  // the authenticated feed itself is already cache: "no-store". This
  // project doesn't enable Cache Components (next.config.ts), so
  // `updateTag` isn't available here — Next 16's "previous model" guide
  // uses `revalidateTag` for on-demand invalidation instead. The second
  // arg is required by this version's types; `"max"` (stale-while-
  // revalidate) matches what the docs recommend as the default.
  revalidateTag("activity", "max");
  return { success: true };
}
