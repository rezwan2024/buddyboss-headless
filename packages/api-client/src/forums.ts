import {
  forumListSchema,
  forumPostCreateResponseSchema,
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
  /**
   * When set, the read is uncached (`no-store`) instead of the normal
   * ISR-tagged read. Needed for topics/replies specifically: unlike
   * activity/groups/members, these reads carry no per-user fields, so
   * there was no existing reason to ever pass a token — but that also
   * meant a `revalidateTag("forums", "max")` right after posting a topic
   * or reply couldn't be trusted to show it immediately (`"max"` is a
   * long stale-while-revalidate window, not an immediate purge; confirmed
   * live — the reply existed on WordPress but the refetch right after
   * posting still showed "No replies yet."). Pass `accessToken` from a
   * logged-in read for a real read-your-own-writes guarantee instead.
   */
  accessToken?: string;
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
    accessToken: params.accessToken,
    ...(params.accessToken
      ? { cache: "no-store" }
      : { next: { revalidate: 300, tags: ["forums"] } }),
  });
}

/** Single topic — `GET /buddyboss/v1/topics/{id}`. Public, no auth. */
export async function getTopic(id: number): Promise<Topic> {
  return wpFetchJson(`/buddyboss/v1/topics/${id}`, (body) => topicSchema.parse(body), {
    next: { revalidate: 300, tags: ["forums"] },
  });
}

/**
 * Create a topic in a forum — `POST /buddyboss/v1/topics`. `parent` is the
 * forum ID here too — same param name GET uses to filter, unlike replies
 * (see `createReply`'s doc comment). `title`/`content` are both required
 * in practice (empty either one 400s), even though the schema doesn't
 * mark `content` required — confirmed live, not just from doc comments.
 */
export async function createTopic(
  forumId: number,
  title: string,
  content: string,
  accessToken: string,
) {
  return wpFetchJson("/buddyboss/v1/topics", (body) => forumPostCreateResponseSchema.parse(body), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, parent: forumId }),
    accessToken,
    cache: "no-store",
  });
}

/**
 * Reply to a topic — `POST /buddyboss/v1/reply`. Takes `topic_id`, *not*
 * `parent` — confirmed live: GET `/reply?parent=X` filters by topic id,
 * but POST uses a differently-named param for the same thing. `forum_id`
 * is optional (auto-derived from the topic) so it's omitted here.
 */
export async function createReply(topicId: number, content: string, accessToken: string) {
  return wpFetchJson("/buddyboss/v1/reply", (body) => forumPostCreateResponseSchema.parse(body), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, topic_id: topicId }),
    accessToken,
    cache: "no-store",
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
    accessToken: params.accessToken,
    ...(params.accessToken
      ? { cache: "no-store" }
      : { next: { revalidate: 300, tags: ["forums"] } }),
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
