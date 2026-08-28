import {
  activityCommentCreateResponseSchema,
  activityCommentsResponseSchema,
  activityCreateResponseSchema,
  activityListSchema,
} from "@buddyboss-headless/types";
import type { Activity, ActivityCommentsResponse } from "@buddyboss-headless/types";
import { type WpList, wpFetchJson, wpFetchList } from "./wp-fetch";

export interface GetActivityFeedParams {
  page?: number;
  perPage?: number;
  /**
   * When set, the request is authenticated (private-network content and
   * per-user state like `favorited` become visible) and is never cached —
   * an authenticated response is specific to that one user. Omit for the
   * existing anonymous, ISR-cached feed.
   */
  accessToken?: string;
}

/** Global activity feed — `GET /buddyboss/v1/activity`. Public reads work with no auth. */
export async function getActivityFeed(
  params: GetActivityFeedParams = {},
): Promise<WpList<Activity>> {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 20;
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  return wpFetchList(`/buddyboss/v1/activity?${query}`, (body) => activityListSchema.parse(body), {
    accessToken: params.accessToken,
    ...(params.accessToken
      ? { cache: "no-store" }
      : { next: { revalidate: 30, tags: ["activity"] } }),
  });
}

// This install requires `post_title` on every activity_update post
// (`bb_is_activity_post_title_enabled()` is on) — confirmed by a live 400
// `rest_missing_callback_param` without it. Capped at 80 chars
// (`bb_activity_post_title_max_length()`); reusing `content` for it matches
// what the field is actually used for here (a short label), and this
// install has no separate "title" input in its composer either.
const POST_TITLE_MAX_LENGTH = 80;
function titleFromContent(content: string): string {
  return content.slice(0, POST_TITLE_MAX_LENGTH);
}

/**
 * Create a text-only activity post — `POST /buddyboss/v1/activity`. Not
 * used when a photo/video/document is attached — see `attachMediaOrVideo`/
 * `attachDocument` in `./media`, which each create their own activity.
 */
export async function createActivity(content: string, accessToken: string) {
  return wpFetchJson("/buddyboss/v1/activity", (body) => activityCreateResponseSchema.parse(body), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, post_title: titleFromContent(content) }),
    accessToken,
    cache: "no-store",
  });
}

/**
 * Set the caption on an activity that was auto-created by attaching a
 * photo/video/document (see `./media`) — `PATCH /buddyboss/v1/activity/{id}`.
 */
export async function setActivityContent(activityId: number, content: string, accessToken: string) {
  return wpFetchJson(
    `/buddyboss/v1/activity/${activityId}`,
    (body) => activityCreateResponseSchema.parse(body),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, post_title: titleFromContent(content) }),
      accessToken,
      cache: "no-store",
    },
  );
}

/** Comments on one activity item — `GET /buddyboss/v1/activity/{id}/comment`. Public, no auth. */
export async function getActivityComments(activityId: number): Promise<ActivityCommentsResponse> {
  return wpFetchJson(
    `/buddyboss/v1/activity/${activityId}/comment`,
    (body) => activityCommentsResponseSchema.parse(body),
    { next: { revalidate: 30, tags: ["activity"] } },
  );
}

/**
 * Post a top-level comment on an activity — `POST
 * /buddyboss/v1/activity/{id}/comment`. Unlike the main create-activity
 * endpoint, this one has no `post_title` requirement — confirmed live.
 * Replying to a specific comment (rather than the activity itself) would
 * need `parent_id`, not supported here yet.
 */
export async function createActivityComment(
  activityId: number,
  content: string,
  accessToken: string,
) {
  return wpFetchJson(
    `/buddyboss/v1/activity/${activityId}/comment`,
    (body) => activityCommentCreateResponseSchema.parse(body),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      accessToken,
      cache: "no-store",
    },
  );
}
