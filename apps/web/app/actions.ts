"use server";

import { getActivityFeed } from "@buddyboss-headless/api-client";

const PER_PAGE = 20;

/** Called client-side by the infinite-scroll activity feed for pages after the first. */
export async function loadActivityPage(page: number) {
  return getActivityFeed({ page, perPage: PER_PAGE });
}
