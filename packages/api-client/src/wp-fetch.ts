// The single transport for every call to the BuddyBoss REST API. No auth yet
// (Phase 3) — this is anonymous-only. Never call the WordPress host from
// anywhere else; route through here so caching, error handling, and (later)
// auth headers stay in one place.

/**
 * Next.js augments the global `fetch`'s `RequestInit` with a `next` option
 * for cache revalidation. This package doesn't depend on `next`, so the
 * extension is declared locally rather than picked up ambiently.
 */
export type WpFetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
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

/**
 * Raw fetch against `${WP_URL}/wp-json<path>`. Returns the Response
 * unparsed — use `wpFetchJson`/`wpFetchList` when you also want body
 * validation.
 */
export async function wpFetch(path: string, init: WpFetchInit = {}): Promise<Response> {
  const url = `${baseUrl()}/wp-json${path}`;
  return fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...init.headers },
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
