import { forumListSchema, replyListSchema, topicListSchema } from "@buddyboss-headless/types";
import { describe, expect, it } from "vitest";

describe("forumListSchema", () => {
  it("parses a real-shaped response", () => {
    const [forum] = forumListSchema.parse([
      {
        id: 172,
        title: { rendered: "Foodie&#8217;s Group" },
        content: { rendered: "<p>Default Forum for Foodie's Group Group</p>\n" },
        slug: "foodies-group",
        total_topic_count: 4,
        total_reply_count: 10,
        last_active_time: "2026-02-23 20:52:45",
        is_closed: false,
      },
    ]);
    expect(forum.title.rendered).toContain("Foodie");
    expect(forum.total_topic_count).toBe(4);
  });

  it("falls back instead of throwing on a missing/malformed field", () => {
    const [forum] = forumListSchema.parse([{ id: "172", total_topic_count: "not-a-number" }]);
    expect(forum.id).toBe(172);
    expect(forum.total_topic_count).toBe(0);
    expect(forum.title).toEqual({ rendered: "" });
  });
});

describe("topicListSchema", () => {
  it("parses a real-shaped response, coercing the loose total_reply_count", () => {
    const [topic] = topicListSchema.parse([
      {
        id: 118,
        title: { rendered: "Forum Amazing Discussion" },
        content: { rendered: "<p>Map out your future.</p>\n" },
        author: 10,
        date: "2026-02-23T20:52:44",
        forum_id: 112,
        total_reply_count: "6", // loose type straight from the live API
        is_closed: false,
        sticky: false,
      },
    ]);
    expect(topic.total_reply_count).toBe(6);
    expect(topic.author).toBe(10);
  });
});

describe("replyListSchema", () => {
  it("parses a real-shaped response", () => {
    const [reply] = replyListSchema.parse([
      {
        id: 216,
        content: { rendered: "<p>Life is like riding a bicycle.</p>\n" },
        author: 13,
        date: "2026-02-23T20:52:46",
        parent: 183,
        depth: 1,
      },
    ]);
    expect(reply.parent).toBe(183);
    expect(reply.depth).toBe(1);
  });
});
