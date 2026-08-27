import {
  postAuthorAvatar,
  postAuthorName,
  postFeaturedImage,
  postListSchema,
} from "@buddyboss-headless/types";
import { describe, expect, it } from "vitest";

const rawSample = [
  {
    id: 673,
    slug: "buddyboss-tab-creator-plugin",
    date: "2026-07-27T18:10:18",
    title: { rendered: "BuddyBoss Tab Creator Plugin" },
    excerpt: { rendered: "<p>Key features edede efef</p>\n" },
    content: { rendered: "<p>Key features edede efef</p>\n" },
    author_avatar_url: "https://example.test/avatar-thumb.jpg",
    comments_count: "0", // loose type straight from the live API
    primary_category_label: "Uncategorized",
    _embedded: {
      author: [
        {
          name: "First Responders Children's Foundation",
          avatar_urls: {
            "24": "https://example.test/a24.jpg",
            "96": "https://example.test/a96.jpg",
          },
        },
      ],
      "wp:featuredmedia": [
        {
          source_url: "https://example.test/full.png",
          media_details: { sizes: { medium: { source_url: "https://example.test/medium.png" } } },
        },
      ],
    },
  },
];

describe("postListSchema", () => {
  it("parses a real-shaped response, coercing loose comments_count", () => {
    const [post] = postListSchema.parse(rawSample);
    expect(post.comments_count).toBe(0);
    expect(post.title.rendered).toBe("BuddyBoss Tab Creator Plugin");
  });

  it("falls back instead of throwing when _embedded is absent (no _embed requested)", () => {
    const { _embedded, ...withoutEmbed } = rawSample[0];
    const [post] = postListSchema.parse([withoutEmbed]);
    expect(post._embedded.author).toEqual([]);
    expect(postAuthorName(post)).toBe("");
  });
});

describe("post helpers", () => {
  const [post] = postListSchema.parse(rawSample);

  it("postAuthorName reads the embedded author's name", () => {
    expect(postAuthorName(post)).toBe("First Responders Children's Foundation");
  });

  it("postAuthorAvatar prefers the embedded 96px avatar over author_avatar_url", () => {
    expect(postAuthorAvatar(post)).toBe("https://example.test/a96.jpg");
  });

  it("postAuthorAvatar falls back to author_avatar_url with no embed", () => {
    const { _embedded, ...withoutEmbed } = rawSample[0];
    const [bare] = postListSchema.parse([withoutEmbed]);
    expect(postAuthorAvatar(bare)).toBe("https://example.test/avatar-thumb.jpg");
  });

  it("postFeaturedImage prefers the medium size over the full source", () => {
    expect(postFeaturedImage(post)).toBe("https://example.test/medium.png");
  });

  it("postFeaturedImage returns empty string with no featured image", () => {
    const { _embedded, ...withoutEmbed } = rawSample[0];
    const [bare] = postListSchema.parse([withoutEmbed]);
    expect(postFeaturedImage(bare)).toBe("");
  });
});
