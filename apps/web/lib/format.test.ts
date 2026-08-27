import { describe, expect, it } from "vitest";
import { decodeEntities, parseReactedNames, timeAgo } from "./format";

describe("decodeEntities", () => {
  it("decodes the entities BuddyBoss actually sends", () => {
    expect(decodeEntities("First Responders Children&#039;s Foundation")).toBe(
      "First Responders Children's Foundation",
    );
    expect(decodeEntities("&quot;quoted&quot; &amp; &lt;tag&gt;")).toBe('"quoted" & <tag>');
  });

  it("leaves plain text untouched", () => {
    expect(decodeEntities("Shakeel Ahmad")).toBe("Shakeel Ahmad");
  });
});

describe("parseReactedNames", () => {
  it("splits, trims, and decodes entities in a comma-separated name list", () => {
    expect(parseReactedNames("First Responders Children&#039;s Foundation, Shakeel Ahmad")).toEqual(
      ["First Responders Children's Foundation", "Shakeel Ahmad"],
    );
  });

  it("returns an empty array for an empty string", () => {
    expect(parseReactedNames("")).toEqual([]);
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-08-27T12:00:00Z").getTime();

  it("reports seconds-old activity as just now", () => {
    expect(timeAgo("2026-08-27T11:59:50Z", now)).toBe("just now");
  });

  it("reports minutes", () => {
    expect(timeAgo("2026-08-27T11:45:00Z", now)).toBe("15m ago");
  });

  it("reports hours", () => {
    expect(timeAgo("2026-08-27T09:00:00Z", now)).toBe("3h ago");
  });

  it("reports days", () => {
    expect(timeAgo("2026-08-24T12:00:00Z", now)).toBe("3d ago");
  });
});
