import { activityCommentsResponseSchema, activityListSchema } from "@buddyboss-headless/types";
import { describe, expect, it } from "vitest";

// BuddyBoss's real response mixes types across items — booleans as "" or 0,
// numbers as strings, missing optional blobs. This is a trimmed real sample
// (see docs/samples/buddyboss-v1-activity.json) covering that inconsistency,
// not a clean fixture.
const rawSample = [
  {
    id: 373,
    user_id: 3,
    name: "First Responders Children&#039;s Foundation",
    mention_name: "rezwan.dev",
    component: "activity",
    type: "activity_update",
    date: "2026-08-27T11:02:52",
    link: "https://example.test/news-feed/p/373/",
    user_link: "https://example.test/members/rezwan-dev/",
    user_avatar: {
      full: "https://example.test/avatars/3/full.jpg",
      thumb: "https://example.test/avatars/3/thumb.jpg",
    },
    title: '<a href="...">First Responders Children&#039;s Foundation</a> posted an update',
    content: { rendered: "<p>Written from Claude Code</p>\n" },
    content_stripped: "Written from Claude Code",
    privacy: "public",
    favorited: false,
    can_favorite: false,
    favorite_count: 0,
    can_comment: true,
    comment_count: 0,
  },
  {
    // friendship_created activity — no content, is_edited is "" not false,
    // report_button_text is `false` (boolean) instead of a string.
    id: 370,
    user_id: 23,
    name: "Shakeel Ahmad",
    mention_name: "shakeel",
    component: "friends",
    type: "friendship_created",
    date: "2026-08-26T10:59:47",
    link: "https://example.test/news-feed/p/370/",
    user_link: "https://example.test/members/shakeel/",
    user_avatar: {
      full: "https://example.test/plugins/buddyboss-platform/bp-core/images/profile-avatar-buddyboss.png",
      thumb: "https://example.test/profile-avatar-buddyboss-50.png",
    },
    title: "Shakeel Ahmad and First Responders Children's Foundation are now connected",
    content: { rendered: "" },
    content_stripped: "",
    privacy: "public",
    // loose types straight from the live API: "0"/"1" instead of booleans
    favorited: "0",
    can_favorite: "0",
    favorite_count: "0",
    can_comment: "1",
    comment_count: "0",
  },
];

describe("activityListSchema", () => {
  it("parses a real-shaped response, coercing loose booleans/numbers", () => {
    const items = activityListSchema.parse(rawSample);
    expect(items).toHaveLength(2);
    expect(items[1].favorited).toBe(false);
    expect(items[1].can_comment).toBe(true);
    expect(items[1].comment_count).toBe(0);
    expect(items[0].content.rendered).toContain("Written from Claude Code");
  });

  it("falls back instead of throwing on a missing/malformed field", () => {
    const [broken] = activityListSchema.parse([
      { ...rawSample[0], user_avatar: null, favorite_count: "not-a-number" },
    ]);
    expect(broken.user_avatar).toEqual({ full: "", thumb: "" });
    expect(broken.favorite_count).toBe(0);
  });
});

describe("activityCommentsResponseSchema", () => {
  it("parses arbitrarily nested replies (comments carry their own comments)", () => {
    // Real shape from GET /buddyboss/v1/activity/{id}/comment: a reply to a
    // comment is nested under that comment's own `comments` key.
    const response = {
      comment_count: 3,
      comments: [
        {
          ...rawSample[0],
          id: 374,
          content_stripped: "hi",
          comments: [
            {
              ...rawSample[0],
              id: 375,
              content_stripped: "ok",
            },
          ],
        },
        {
          ...rawSample[0],
          id: 376,
          content_stripped: "2nd",
        },
      ],
    };

    const parsed = activityCommentsResponseSchema.parse(response);
    expect(parsed.comments).toHaveLength(2);
    expect(parsed.comments[0].content_stripped).toBe("hi");
    expect(parsed.comments[0].comments).toHaveLength(1);
    expect(parsed.comments[0].comments?.[0].content_stripped).toBe("ok");
    expect(parsed.comments[1].content_stripped).toBe("2nd");
    expect(parsed.comments[1].comments).toBeUndefined();
  });
});
