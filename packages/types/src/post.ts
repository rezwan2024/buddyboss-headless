// Derived from GET /wp/v2/posts?_embed=1 — WordPress core, not a
// buddyboss/v1 route. `_embed` resolves the author's name/avatar and the
// featured image in the same request instead of extra round trips.
import { z } from "zod";
import { looseNumber } from "./shared";

const renderedText = z.object({ rendered: z.string().catch("") }).catch({ rendered: "" });

const embeddedAuthorSchema = z
  .object({
    name: z.string().catch(""),
    avatar_urls: z.record(z.string(), z.string()).catch({}),
  })
  .catch({ name: "", avatar_urls: {} });

const embeddedFeaturedMediaSchema = z
  .object({
    source_url: z.string().catch(""),
    media_details: z
      .object({
        sizes: z
          .object({
            medium: z.object({ source_url: z.string().catch("") }).optional(),
          })
          .catch({}),
      })
      .catch({ sizes: {} }),
  })
  .catch({ source_url: "", media_details: { sizes: {} } });

export const postSchema = z.object({
  id: looseNumber,
  slug: z.string().catch(""),
  date: z.string().catch(""),
  title: renderedText,
  excerpt: renderedText,
  content: renderedText,
  author_avatar_url: z.string().catch(""),
  comments_count: looseNumber,
  primary_category_label: z.string().catch(""),
  _embedded: z
    .object({
      author: z.array(embeddedAuthorSchema).catch([]),
      "wp:featuredmedia": z.array(embeddedFeaturedMediaSchema).catch([]).optional(),
    })
    .catch({ author: [] }),
});

export type Post = z.infer<typeof postSchema>;

export const postListSchema = z.array(postSchema);

// Helpers to pull the two embedded bits out without every caller repeating
// the same optional-chaining dance.
export function postAuthorName(post: Post): string {
  return post._embedded.author[0]?.name ?? "";
}

export function postAuthorAvatar(post: Post): string {
  return post._embedded.author[0]?.avatar_urls["96"] ?? post.author_avatar_url;
}

export function postFeaturedImage(post: Post): string {
  const media = post._embedded["wp:featuredmedia"]?.[0];
  return media?.media_details.sizes.medium?.source_url ?? media?.source_url ?? "";
}
