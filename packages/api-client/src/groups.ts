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

/** Single group — `GET /buddyboss/v1/groups/{id}`. Public, no auth. */
export async function getGroup(id: number): Promise<Group> {
  return wpFetchJson(`/buddyboss/v1/groups/${id}`, (body) => groupSchema.parse(body), {
    next: { revalidate: 300, tags: ["groups"] },
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
