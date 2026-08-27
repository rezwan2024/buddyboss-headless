"use server";

import {
  getActivityComments,
  getActivityFeed,
  getGroupMembers,
  getGroups,
  getMembers,
} from "@buddyboss-headless/api-client";

const PER_PAGE = 20;

/** Called client-side by the infinite-scroll activity feed for pages after the first. */
export async function loadActivityPage(page: number) {
  return getActivityFeed({ page, perPage: PER_PAGE });
}

/** Called client-side when a user expands an activity item's comment thread. */
export async function loadActivityComments(activityId: number) {
  return getActivityComments(activityId);
}

/** Called client-side by the infinite-scroll member directory, including on search. */
export async function loadMembersPage(page: number, search: string) {
  return getMembers({ page, perPage: PER_PAGE, search: search || undefined });
}

/** Called client-side by the infinite-scroll groups directory, including on search. */
export async function loadGroupsPage(page: number, search: string) {
  return getGroups({ page, perPage: PER_PAGE, search: search || undefined });
}

/** Called client-side by the infinite-scroll member list on a group's page. */
export async function loadGroupMembersPage(groupId: number, page: number) {
  return getGroupMembers(groupId, { page, perPage: PER_PAGE });
}
