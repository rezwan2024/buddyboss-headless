import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit, recordFailure, recordSuccess } from "./rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows attempts under the failure threshold", () => {
    const key = `under-threshold-${Math.random()}`;
    for (let i = 0; i < 4; i++) recordFailure(key);
    expect(checkRateLimit(key).limited).toBe(false);
  });

  it("blocks once the failure threshold is reached", () => {
    const key = `at-threshold-${Math.random()}`;
    for (let i = 0; i < 5; i++) recordFailure(key);
    const status = checkRateLimit(key);
    expect(status.limited).toBe(true);
    expect(status.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("clears the count on success", () => {
    const key = `clears-${Math.random()}`;
    for (let i = 0; i < 5; i++) recordFailure(key);
    expect(checkRateLimit(key).limited).toBe(true);
    recordSuccess(key);
    expect(checkRateLimit(key).limited).toBe(false);
  });

  it("tracks separate keys independently", () => {
    const a = `key-a-${Math.random()}`;
    const b = `key-b-${Math.random()}`;
    for (let i = 0; i < 5; i++) recordFailure(a);
    expect(checkRateLimit(a).limited).toBe(true);
    expect(checkRateLimit(b).limited).toBe(false);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    const key = `expires-${Math.random()}`;
    for (let i = 0; i < 5; i++) recordFailure(key);
    expect(checkRateLimit(key).limited).toBe(true);
    vi.advanceTimersByTime(11 * 60 * 1000);
    expect(checkRateLimit(key).limited).toBe(false);
    vi.useRealTimers();
  });
});
