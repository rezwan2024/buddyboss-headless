// The single transport for every call to the BuddyBoss REST API. Never call
// the WordPress host from anywhere else; route through here so caching,
// error handling, and auth headers stay in one place.

/**
 * Next.js augments the global `fetch`'s `RequestInit` with a `next` option
 * for cache revalidation. This package doesn't depend on `next`, so the
 * extension is declared locally rather than picked up ambiently.
 *
 * `accessToken`, when set, is sent as `Authorization: Bearer <token>` — the
 * caller (a Server Component/Action reading the session cookie) is
 * responsible for also passing `cache: "no-store"` alongside it, since an
 * authenticated response is user-specific and must never be cached for
 * other users. wp-fetch doesn't force this automatically because most
 * calls stay anonymous even after Phase 3 — only screens that actually
 * personalize need it.
 */
export type WpFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
  accessToken?: string;
};

export class WpApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
  ) {
    super(message);
    this.name = "WpApiError";
  }
}

function baseUrl(): string {
  const url = process.env.WP_URL;
  if (!url) {
    throw new Error(
      "WP_URL is not set. Add it to .env.local (and the Vercel dashboard for deploys).",
    );
  }
  return url.replace(/\/$/, "");
}

// The remote WP host occasionally resets the connection mid-request
// (ECONNRESET) — seen independently in this project's own e2e runs, not
// something specific to any one route. A network-level failure here throws
// before any response exists, so retrying is only safe for idempotent
// methods: retrying a POST could double-create if the request actually
// reached WordPress and only the response was lost in transit.
const RETRYABLE_METHODS = new Set(["GET", "HEAD"]);
// Bumped from a single retry (2 attempts total) to 2 retries (3 total) after
// a real "Couldn't load the activity feed" crash (React error #441)
// recurred live — a single retry isn't always enough under this shared dev
// host's own documented concurrency ceiling (see DECISIONS.md). A read is
// also given an upper-bound timeout so a hang fails fast enough to retry
// instead of leaving the caller waiting indefinitely.
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 10000;

async function fetchWithRetry(url: string, init: RequestInit): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const attempts = RETRYABLE_METHODS.has(method) ? MAX_ATTEMPTS : 1;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(TIMEOUT_MS) });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Raw fetch against `${WP_URL}/wp-json<path>`. Returns the Response
 * unparsed — use `wpFetchJson`/`wpFetchList` when you also want body
 * validation.
 */
export async function wpFetch(path: string, init: WpFetchInit = {}): Promise<Response> {
  const { accessToken, ...rest } = init;
  const url = `${baseUrl()}/wp-json${path}`;
  return fetchWithRetry(url, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
}

/**
 * Fetch a single JSON resource and validate it with `parse` (typically
 * `(body) => someSchema.parse(body)`).
 *
 * BuddyBoss returns 200 with filtered/empty data for permission failures
 * rather than a 403 — this only throws on a non-2xx status or a body that
 * fails validation. It does not assert the data is what you expected to
 * see; check that at the call site.
 */
export async function wpFetchJson<T>(
  path: string,
  parse: (body: unknown) => T,
  init: WpFetchInit = {},
): Promise<T> {
  const res = await wpFetch(path, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new WpApiError(`BuddyBoss API ${res.status} for ${path}`, res.status, path);
  }
  return parse(body);
}

export interface WpList<T> {
  items: T[];
  total: number;
  pages: number;
}

/**
 * Fetch a paginated collection. BuddyBoss puts the total count and page
 * count in headers (`X-WP-Total`, `X-WP-TotalPages`), not the body.
 */
export async function wpFetchList<T>(
  path: string,
  parse: (body: unknown) => T[],
  init: WpFetchInit = {},
): Promise<WpList<T>> {
  const res = await wpFetch(path, init);
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new WpApiError(`BuddyBoss API ${res.status} for ${path}`, res.status, path);
  }
  const items = parse(body);
  const total = Number(res.headers.get("x-wp-total") ?? items.length);
  const pages = Number(res.headers.get("x-wp-totalpages") ?? 1);
  return { items, total, pages };
}
