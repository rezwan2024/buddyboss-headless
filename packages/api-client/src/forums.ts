import {
  forumListSchema,
  forumSchema,
  replyListSchema,
  topicListSchema,
  topicSchema,
} from "@buddyboss-headless/types";
import type { Forum, Reply, Topic } from "@buddyboss-headless/types";
import { getMembersByIds } from "./members";
import { type WpList, wpFetchJson, wpFetchList } from "./wp-fetch";

export interface PageParams {
  page?: number;
  perPage?: number;
}

/** Forum list — `GET /buddyboss/v1/forums`. Public, no auth. */
export async function getForums(params: PageParams = {}): Promise<WpList<Forum>> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
  });
  return wpFetchList(`/buddyboss/v1/forums?${query}`, (body) => forumListSchema.parse(body), {
    next: { revalidate: 300, tags: ["forums"] },
  });
}

/** Single forum — `GET /buddyboss/v1/forums/{id}`. Public, no auth. */
export async function getForum(id: number): Promise<Forum> {
  return wpFetchJson(`/buddyboss/v1/forums/${id}`, (body) => forumSchema.parse(body), {
    next: { revalidate: 300, tags: ["forums"] },
  });
}

/**
 * A forum's topics — `GET /buddyboss/v1/topics?parent={forumId}`.
 *
 * The `parent` query param is the one that actually filters by forum, even
 * though the response body's own field is named `forum_id` — confirmed via
 * an OPTIONS request against the live API; `forum_id`/`forum` as query
 * params are silently ignored (200 with the unfiltered list).
 */
export async function getTopics(forumId: number, params: PageParams = {}): Promise<WpList<Topic>> {
  const query = new URLSearchParams({
    parent: String(forumId),
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
  });
  return wpFetchList(`/buddyboss/v1/topics?${query}`, (body) => topicListSchema.parse(body), {
    next: { revalidate: 300, tags: ["forums"] },
  });
}

/** Single topic — `GET /buddyboss/v1/topics/{id}`. Public, no auth. */
export async function getTopic(id: number): Promise<Topic> {
  return wpFetchJson(`/buddyboss/v1/topics/${id}`, (body) => topicSchema.parse(body), {
    next: { revalidate: 300, tags: ["forums"] },
  });
}

/** A topic's replies — `GET /buddyboss/v1/reply?parent={topicId}`. Same `parent` param as topics. */
export async function getReplies(topicId: number, params: PageParams = {}): Promise<WpList<Reply>> {
  const query = new URLSearchParams({
    parent: String(topicId),
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
  });
  return wpFetchList(`/buddyboss/v1/reply?${query}`, (body) => replyListSchema.parse(body), {
    next: { revalidate: 300, tags: ["forums"] },
  });
}

// Topics and replies only carry a bare numeric `author` — no embedded name
// or avatar (bbPress, not BP-table shaped). Resolve display info with one
// batched member lookup per page instead of an N+1 fetch per item.
export interface WithAuthor {
  author_name: string;
  author_avatar: string;
}

async function resolveAuthors<T extends { author: number }>(
  items: T[],
): Promise<(T & WithAuthor)[]> {
  const authorIds = [...new Set(items.map((item) => item.author))];
  const authors = await getMembersByIds(authorIds);
  const byId = new Map(authors.map((a) => [a.id, a]));
  return items.map((item) => {
    const author = byId.get(item.author);
    return {
      ...item,
      author_name: author?.name ?? "Member",
      author_avatar: author?.avatar_urls.thumb ?? "",
    };
  });
}

export type TopicWithAuthor = Topic & WithAuthor;

/** Same as `getTopic`, with the author name/avatar resolved. */
export async function getTopicWithAuthor(id: number): Promise<TopicWithAuthor> {
  const topic = await getTopic(id);
  const [resolved] = await resolveAuthors([topic]);
  return resolved;
}

/** Same as `getTopics`, with each topic's author name/avatar resolved. */
export async function getTopicsWithAuthors(
  forumId: number,
  params: PageParams = {},
): Promise<WpList<TopicWithAuthor>> {
  const { items, total, pages } = await getTopics(forumId, params);
  return { items: await resolveAuthors(items), total, pages };
}

export type ReplyWithAuthor = Reply & WithAuthor;

/** Same as `getReplies`, with each reply's author name/avatar resolved. */
export async function getRepliesWithAuthors(
  topicId: number,
  params: PageParams = {},
): Promise<WpList<ReplyWithAuthor>> {
  const { items, total, pages } = await getReplies(topicId, params);
  return { items: await resolveAuthors(items), total, pages };
}
