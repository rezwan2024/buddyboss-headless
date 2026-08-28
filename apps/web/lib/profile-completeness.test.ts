import type { MemberDetail, XProfileGroupDef } from "@buddyboss-headless/types";
import { describe, expect, it } from "vitest";
import { computeProfileCompleteness } from "./profile-completeness";

// Real shape confirmed live via curl against GET /buddyboss/v1/xprofile/groups?fetch_fields=1 —
// Details group has 3 required fields (First Name, Nickname, Last Name)
// plus 3 optional; Default Data has 2 required (Checkboxes, Paragraph
// Text) plus 3 optional. 5 required fields total.
const fieldDefs: XProfileGroupDef[] = [
  {
    id: 1,
    name: "Details",
    fields: [
      { id: 1, name: "First Name", is_required: true },
      { id: 3, name: "Nickname", is_required: true },
      { id: 2, name: "Last Name", is_required: true },
      { id: 19, name: "I Can Help With", is_required: false },
      { id: 20, name: "What I'm Working On", is_required: false },
      { id: 21, name: "Social share", is_required: false },
    ],
  },
  {
    id: 2,
    name: "Default Data",
    fields: [
      { id: 15, name: "Radio Buttons", is_required: false },
      { id: 11, name: "Drop Down", is_required: false },
      { id: 6, name: "Checkboxes", is_required: true },
      { id: 5, name: "Number", is_required: false },
      { id: 4, name: "Paragraph Text", is_required: true },
    ],
  },
];

function member(overrides: Partial<MemberDetail>): MemberDetail {
  return {
    id: 25,
    name: "Headless Test Account",
    user_login: "headless-test",
    mention_name: "headless-test",
    link: "",
    registered_date: "",
    last_activity: "",
    avatar_urls: { full: "", thumb: "", is_default: true },
    is_wp_admin: false,
    cover_url: "",
    cover_is_default: true,
    xprofile: { groups: {} },
    friendship_status: "not_friends",
    friendship_id: 0,
    create_friendship: true,
    ...overrides,
  };
}

describe("computeProfileCompleteness", () => {
  it("counts a real, partially-filled profile the same as the live sample it was verified against", () => {
    // Real shape from GET /buddyboss/v1/members/25 — Details group has
    // First Name (1) and Nickname (3) filled, Last Name (2) missing; no
    // Default Data group at all (nothing filled in it); default avatar and
    // cover (both never uploaded).
    const m = member({
      xprofile: {
        groups: {
          "1": {
            name: "Details",
            fields: {
              "1": { name: "First Name", value: { raw: "headless-test" } },
              "3": { name: "Nickname", value: { raw: "headless-test" } },
            },
          },
        },
      },
    });

    const result = computeProfileCompleteness(m, fieldDefs);
    expect(result.filled).toBe(2); // First Name + Nickname, no photo/cover
    expect(result.total).toBe(7); // 5 required fields + photo + cover
    expect(result.percent).toBe(29);
    expect(result.hasPhoto).toBe(false);
    expect(result.hasCover).toBe(false);
  });

  it("counts a fully-filled profile with a real photo and cover as 100%", () => {
    const m = member({
      avatar_urls: { full: "", thumb: "", is_default: false },
      cover_is_default: false,
      xprofile: {
        groups: {
          "1": {
            name: "Details",
            fields: {
              "1": { name: "First Name", value: { raw: "First Responders" } },
              "2": { name: "Last Name", value: { raw: "Children's Foundation" } },
              "3": { name: "Nickname", value: { raw: "rezwan.dev" } },
            },
          },
          "2": {
            name: "Default Data",
            fields: {
              "6": { name: "Checkboxes", value: { raw: "yes" } },
              "4": { name: "Paragraph Text", value: { raw: "hello" } },
            },
          },
        },
      },
    });

    const result = computeProfileCompleteness(m, fieldDefs);
    expect(result.filled).toBe(7);
    expect(result.total).toBe(7);
    expect(result.percent).toBe(100);
  });

  it("ignores optional fields entirely — filling only optional ones still reads as 0%", () => {
    const m = member({
      xprofile: {
        groups: {
          "1": {
            name: "Details",
            fields: {
              "19": { name: "I Can Help With", value: { raw: "advice" } },
            },
          },
        },
      },
    });

    const result = computeProfileCompleteness(m, fieldDefs);
    expect(result.filled).toBe(0);
    expect(result.percent).toBe(0);
  });
});
