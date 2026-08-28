import { groupListSchema, groupSchema, memberListSchema } from "@buddyboss-headless/types";
import type { Group, Member } from "@buddyboss-headless/types";
import { type WpList, wpFetchJson, wpFetchList } from "./wp-fetch";

export interface GetGroupsParams {
  page?: number;
  perPage?: number;
  search?: string;
}

/** Groups directory — `GET /buddyboss/v1/groups`. Public, no auth. */
export async function getGroups(params: GetGroupsParams = {}): Promise<WpList<Group>> {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 20;
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (params.search) query.set("search", params.search);

  return wpFetchList(`/buddyboss/v1/groups?${query}`, (body) => groupListSchema.parse(body), {
    next: { revalidate: 300, tags: ["groups"] },
  });
}

/**
 * Single group — `GET /buddyboss/v1/groups/{id}`. Public, no auth, BUT the
 * `is_member`/`can_join`/`request_id` fields are per-user — pass
 * `accessToken` (and expect a `no-store`, uncached read) whenever the
 * caller needs those to be accurate for the current user, e.g. to decide
 * what a join/leave button should say.
 */
export async function getGroup(id: number, accessToken?: string): Promise<Group> {
  return wpFetchJson(`/buddyboss/v1/groups/${id}`, (body) => groupSchema.parse(body), {
    accessToken,
    ...(accessToken ? { cache: "no-store" } : { next: { revalidate: 300, tags: ["groups"] } }),
  });
}

/**
 * Join a public group as the current user — `POST
 * /buddyboss/v1/groups/{id}/members`. Confirmed live: calling this on a
 * private/hidden group fails with a 500
 * (`bp_rest_group_member_failed_to_join`) rather than creating a request —
 * check `group.status` first and use `requestGroupMembership` instead for
 * `'private'`. Calling it twice (already a member) also 500s.
 */
export async function joinGroup(groupId: number, accessToken: string): Promise<void> {
  await wpFetchJson(`/buddyboss/v1/groups/${groupId}/members`, (body) => body, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    accessToken,
    cache: "no-store",
  });
}

/** Leave a group — `DELETE /buddyboss/v1/groups/{id}/members/{user_id}`. */
export async function leaveGroup(
  groupId: number,
  userId: number,
  accessToken: string,
): Promise<void> {
  await wpFetchJson(`/buddyboss/v1/groups/${groupId}/members/${userId}`, (body) => body, {
    method: "DELETE",
    accessToken,
    cache: "no-store",
  });
}

/**
 * Request to join a private group — `POST
 * /buddyboss/v1/groups/membership-requests`. Confirmed live: a duplicate
 * request 500s (`bp_rest_group_membership_requests_duplicate_request`) —
 * check `group.request_id` first.
 */
export async function requestGroupMembership(groupId: number, accessToken: string): Promise<void> {
  await wpFetchJson("/buddyboss/v1/groups/membership-requests", (body) => body, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group_id: groupId }),
    accessToken,
    cache: "no-store",
  });
}

/** Cancel a pending join request — `DELETE /buddyboss/v1/groups/membership-requests/{request_id}`. */
export async function cancelGroupMembershipRequest(
  requestId: number,
  accessToken: string,
): Promise<void> {
  await wpFetchJson(`/buddyboss/v1/groups/membership-requests/${requestId}`, (body) => body, {
    method: "DELETE",
    accessToken,
    cache: "no-store",
  });
}

export interface GetGroupMembersParams {
  page?: number;
  perPage?: number;
}

/** A group's member list — `GET /buddyboss/v1/groups/{id}/members`. Public, no auth. */
export async function getGroupMembers(
  groupId: number,
  params: GetGroupMembersParams = {},
): Promise<WpList<Member>> {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 20;
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });

  return wpFetchList(
    `/buddyboss/v1/groups/${groupId}/members?${query}`,
    (body) => memberListSchema.parse(body),
    { next: { revalidate: 300, tags: ["groups"] } },
  );
}
