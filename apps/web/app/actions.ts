"use server";

import { getAccessToken } from "@/lib/session";
import {
  getActivityComments,
  getActivityFeed,
  getForums,
  getGroupMembers,
  getGroups,
  getMembers,
  getPosts,
  getRepliesWithAuthors,
  getThread,
  getThreads,
  getTopicsWithAuthors,
} from "@buddyboss-headless/api-client";

const PER_PAGE = 20;

/** Called client-side by the infinite-scroll activity feed for pages after the first. */
export async function loadActivityPage(page: number) {
  // Server Actions can read cookies() directly — matches the auth-awareness
  // of the initial page.tsx fetch, so paginating while logged in doesn't
  // silently fall back to the anonymous feed.
  const accessToken = await getAccessToken();
  return getActivityFeed({ page, perPage: PER_PAGE, accessToken: accessToken ?? undefined });
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

/** Called client-side by the infinite-scroll forums list. */
export async function loadForumsPage(page: number) {
  return getForums({ page, perPage: PER_PAGE });
}

/**
 * Called client-side by the infinite-scroll topic list on a forum's page.
 * Reads uncached when logged in — see `PageParams.accessToken`'s doc
 * comment for why posting a topic needs this to show up without a reload.
 */
export async function loadTopicsPage(forumId: number, page: number) {
  const accessToken = await getAccessToken();
  return getTopicsWithAuthors(forumId, {
    page,
    perPage: PER_PAGE,
    accessToken: accessToken ?? undefined,
  });
}

/** Called client-side by the infinite-scroll reply list on a topic's page. Same reasoning as `loadTopicsPage`. */
export async function loadRepliesPage(topicId: number, page: number) {
  const accessToken = await getAccessToken();
  return getRepliesWithAuthors(topicId, {
    page,
    perPage: PER_PAGE,
    accessToken: accessToken ?? undefined,
  });
}

/** Called client-side by the infinite-scroll blog list, including on search. */
export async function loadPostsPage(page: number, search: string) {
  return getPosts({ page, perPage: PER_PAGE, search: search || undefined });
}

/**
 * Called client-side by the infinite-scroll inbox thread list.
 * `getThreads` requires both a user id and a token (thread data is
 * inherently per-user) — returns an empty page if logged out rather than
 * throwing, since the page itself already gates on being logged in.
 */
export async function loadThreadsPage(userId: number, page: number) {
  const accessToken = await getAccessToken();
  if (!accessToken) return { items: [], total: 0, pages: 1, unreadCount: 0 };
  return getThreads(userId, accessToken, { page, perPage: PER_PAGE });
}

/**
 * Called client-side by the thread view to refetch after sending a reply
 * — same read-your-own-writes need as `loadTopicsPage`/`loadRepliesPage`,
 * except this one was always `no-store` to begin with (thread data is
 * inherently per-user), so no separate accessToken-threading fix was
 * needed here.
 */
export async function loadThread(threadId: number) {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  return getThread(threadId, accessToken);
}
