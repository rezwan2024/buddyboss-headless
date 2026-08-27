import { groupListSchema } from "@buddyboss-headless/types";
import { describe, expect, it } from "vitest";

const rawSample = [
  {
    id: 1,
    name: "Foodie’s Group",
    slug: "foodies-group",
    description: {
      raw: "...",
      rendered: "<p>Foodie is a person who has an ardent or refined interest in food.</p>\n",
    },
    status: "public",
    last_activity: "2026-08-19T13:12:13",
    members_count: "10", // loose type straight from the live API
    group_type_label: "Team Lead",
    enable_forum: true,
    avatar_urls: {
      thumb: "https://example.test/group-avatar-50.png",
      full: "https://example.test/group-avatar.png",
      is_default: true,
    },
    cover_url: "https://example.test/cover-image.png",
  },
];

describe("groupListSchema", () => {
  it("parses a real-shaped response, coercing loose members_count", () => {
    const [group] = groupListSchema.parse(rawSample);
    expect(group.members_count).toBe(10);
    expect(group.enable_forum).toBe(true);
    expect(group.description.rendered).toContain("Foodie");
  });

  it("falls back instead of throwing on a missing/malformed field", () => {
    const [group] = groupListSchema.parse([
      { ...rawSample[0], avatar_urls: null, members_count: "not-a-number" },
    ]);
    expect(group.avatar_urls).toEqual({ full: "", thumb: "" });
    expect(group.members_count).toBe(0);
  });
});
