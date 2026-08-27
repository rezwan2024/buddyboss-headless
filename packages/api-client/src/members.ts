import { memberDetailSchema, memberListSchema } from "@buddyboss-headless/types";
import type { Member, MemberDetail } from "@buddyboss-headless/types";
import { type WpList, wpFetchJson, wpFetchList } from "./wp-fetch";

export interface GetMembersParams {
  page?: number;
  perPage?: number;
  search?: string;
}

/** Member directory — `GET /buddyboss/v1/members`. Public, no auth. */
export async function getMembers(params: GetMembersParams = {}): Promise<WpList<Member>> {
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 20;
  const query = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  if (params.search) query.set("search", params.search);

  return wpFetchList(`/buddyboss/v1/members?${query}`, (body) => memberListSchema.parse(body), {
    next: { revalidate: 300, tags: ["members"] },
  });
}

/** Single member profile — `GET /buddyboss/v1/members/{id}`. Public, no auth. */
export async function getMember(id: number): Promise<MemberDetail> {
  return wpFetchJson(`/buddyboss/v1/members/${id}`, (body) => memberDetailSchema.parse(body), {
    next: { revalidate: 300, tags: ["members"] },
  });
}
