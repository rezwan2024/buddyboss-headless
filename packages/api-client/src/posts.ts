import { postListSchema } from "@buddyboss-headless/types";
import type { Post } from "@buddyboss-headless/types";
import { type WpList, wpFetchList } from "./wp-fetch";

export interface GetPostsParams {
  page?: number;
  perPage?: number;
  search?: string;
}

/** Blog post list — `GET /wp/v2/posts`. WordPress core, not buddyboss/v1. Public, no auth. */
export async function getPosts(params: GetPostsParams = {}): Promise<WpList<Post>> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
    _embed: "author,wp:featuredmedia",
  });
  if (params.search) query.set("search", params.search);

  return wpFetchList(`/wp/v2/posts?${query}`, (body) => postListSchema.parse(body), {
    next: { revalidate: 3600, tags: ["posts"] },
  });
}

/** Single blog post by slug — `GET /wp/v2/posts?slug={slug}`. Public, no auth. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const query = new URLSearchParams({ slug, _embed: "author,wp:featuredmedia" });
  const { items } = await wpFetchList(
    `/wp/v2/posts?${query}`,
    (body) => postListSchema.parse(body),
    {
      next: { revalidate: 3600, tags: ["posts"] },
    },
  );
  return items[0] ?? null;
}
