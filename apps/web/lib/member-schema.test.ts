import { memberDetailSchema, memberListSchema } from "@buddyboss-headless/types";
import { describe, expect, it } from "vitest";

const rawSample = [
  {
    id: 24,
    name: "efefe efefe",
    user_login: "wdwdw",
    mention_name: "wdwdw",
    link: "https://example.test/members/wdwdw/",
    registered_date: "2026-08-24T14:04:41",
    last_activity: "2026-08-24T15:42:25",
    avatar_urls: {
      full: "https://example.test/profile-avatar-buddyboss.png",
      thumb: "https://example.test/profile-avatar-buddyboss-50.png",
      is_default: true,
    },
    is_wp_admin: false,
  },
  {
    // loose types straight from the live API
    id: "1",
    name: "dfyweb",
    user_login: "dfyweb",
    mention_name: "dfyweb",
    link: "https://example.test/members/dfyweb/",
    registered_date: "",
    last_activity: "",
    avatar_urls: null,
    is_wp_admin: "1",
  },
];

describe("memberListSchema", () => {
  it("parses a real-shaped response, coercing loose types", () => {
    const items = memberListSchema.parse(rawSample);
    expect(items).toHaveLength(2);
    expect(items[1].id).toBe(1);
    expect(items[1].is_wp_admin).toBe(true);
    expect(items[1].avatar_urls).toEqual({ full: "", thumb: "" });
  });
});

describe("memberDetailSchema", () => {
  it("parses the single-member response, including the cover image", () => {
    const member = memberDetailSchema.parse({
      ...rawSample[0],
      cover_url: "https://example.test/cover-image.png",
    });
    expect(member.cover_url).toBe("https://example.test/cover-image.png");
  });

  it("falls back to an empty id (not a throw) for a malformed response", () => {
    const member = memberDetailSchema.parse({ error: "rest_no_route" });
    expect(member.id).toBe(0);
  });
});
