"use server";

import { getActivityComments, getActivityFeed } from "@buddyboss-headless/api-client";

const PER_PAGE = 20;

/** Called client-side by the infinite-scroll activity feed for pages after the first. */
export async function loadActivityPage(page: number) {
  return getActivityFeed({ page, perPage: PER_PAGE });
}

/** Called client-side when a user expands an activity item's comment thread. */
export async function loadActivityComments(activityId: number) {
  return getActivityComments(activityId);
}
