import { activityCommentsResponseSchema, activityListSchema } from "@buddyboss-headless/types";
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

/** Comments on one activity item — `GET /buddyboss/v1/activity/{id}/comment`. Public, no auth. */
export async function getActivityComments(activityId: number): Promise<ActivityCommentsResponse> {
  return wpFetchJson(
    `/buddyboss/v1/activity/${activityId}/comment`,
    (body) => activityCommentsResponseSchema.parse(body),
    { next: { revalidate: 30, tags: ["activity"] } },
  );
}
