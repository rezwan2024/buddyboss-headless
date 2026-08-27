import { activityCommentsResponseSchema, activityListSchema } from "@buddyboss-headless/types";
import type { Activity, ActivityCommentsResponse } from "@buddyboss-headless/types";
import { type WpList, wpFetchJson, wpFetchList } from "./wp-fetch";

export interface GetActivityFeedParams {
  page?: number;
  perPage?: number;
}

/** Global activity feed — `GET /buddyboss/v1/activity`. Public, no auth. */
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
    next: { revalidate: 30, tags: ["activity"] },
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
