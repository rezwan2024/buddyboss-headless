import { NextResponse } from "next/server";

/**
 * Proxies BuddyBoss's `bb-media-preview` URLs (the ones activity photo/video
 * thumbnails use) with retry — unlike our own JSON reads (`wp-fetch.ts`'s
 * `fetchWithRetry`), Next's built-in image optimizer has no retry of its own,
 * and this route's target is measurably slow (confirmed live: ~1.5-2s per
 * request even in isolation, because BuddyBoss serves these through a full
 * WordPress bootstrap on every request rather than a static file — a signed/
 * obfuscated URL, not a plain upload path). Under real concurrent page load
 * against this project's shared, load-sensitive dev host (the same
 * ECONNRESET/concurrency-ceiling issue documented elsewhere in this project),
 * that's enough for some image requests to time out — which the optimizer
 * simply renders as a broken image, with nothing retrying. Routing through
 * here first gives those requests the same retry safety net our own API
 * calls already have.
 *
 * Scope is deliberately narrow — only `${WP_URL}/bb-media-preview/...` URLs
 * are allowed through, both to keep this from becoming an open image proxy
 * (SSRF risk) and because avatars/covers/plain uploads are already fast,
 * static files that don't need this.
 */
const ATTEMPTS = 3;
const TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 300;

function isAllowedUrl(url: URL): boolean {
  const wpUrl = process.env.WP_URL;
  if (!wpUrl) return false;
  const wpOrigin = new URL(wpUrl).origin;
  return url.origin === wpOrigin && url.pathname.startsWith("/bb-media-preview/");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (!isAllowedUrl(targetUrl)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(targetUrl, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) {
        lastError = new Error(`Upstream ${res.status}`);
      } else {
        const contentType = res.headers.get("content-type") ?? "application/octet-stream";
        return new NextResponse(res.body, {
          headers: {
            "Content-Type": contentType,
            // The URL itself is unique per attachment, so its bytes never
            // change — safe to cache aggressively on Vercel's edge/CDN.
            "Cache-Control": "public, max-age=86400, immutable",
          },
        });
      }
    } catch (err) {
      lastError = err;
    }
    if (attempt < ATTEMPTS) await sleep(RETRY_DELAY_MS);
  }

  console.error("media-proxy: all attempts failed", { target, lastError });
  return NextResponse.json({ error: "Couldn't fetch media" }, { status: 502 });
}
