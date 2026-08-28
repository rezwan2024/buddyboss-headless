import { headers } from "next/headers";

// In-memory, per-instance rate limiting for the login form. A serverless
// function's memory isn't shared across concurrent instances or survives
// a redeploy, so this is a real but imperfect deterrent — good enough for
// this project's low-traffic dev/practice site, not a hard guarantee
// under real scale or a distributed attack. See DECISIONS.md for the
// tradeoff against an external store (Upstash/Vercel KV), deliberately
// not used here.
interface Bucket {
  failures: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 5;

export interface RateLimitStatus {
  limited: boolean;
  retryAfterSeconds: number;
}

/** Check before attempting auth. Does not itself count as an attempt. */
export function checkRateLimit(key: string): RateLimitStatus {
  const bucket = buckets.get(key);
  const now = Date.now();
  if (!bucket || bucket.resetAt < now) return { limited: false, retryAfterSeconds: 0 };
  if (bucket.failures < MAX_FAILURES) return { limited: false, retryAfterSeconds: 0 };
  return { limited: true, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
}

/** Call after a failed auth attempt — starts or extends the window for `key`. */
export function recordFailure(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { failures: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.failures += 1;
}

/** Call after a successful auth attempt — a real login clears the slate for `key`. */
export function recordSuccess(key: string): void {
  buckets.delete(key);
}

/**
 * Best-effort client IP for a Server Action request. Vercel populates
 * `x-forwarded-for` (may list multiple hops — the first is the original
 * client); falls back to a constant key if neither header is present
 * (e.g. local dev behind no proxy), which just means local requests share
 * one bucket — acceptable since this only matters in a real deployment.
 */
export async function getClientIp(): Promise<string> {
  const store = await headers();
  const forwardedFor = store.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return store.get("x-real-ip") ?? "unknown";
}
