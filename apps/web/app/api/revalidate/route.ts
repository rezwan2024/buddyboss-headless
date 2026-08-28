import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Called by wp/plugin-headless's Revalidate class on `save_post` — purges
 * this frontend's ISR cache immediately instead of waiting out the
 * per-route revalidate window (30s–3600s depending on the route). Maps a
 * WordPress post type to the fetch tag that data is cached under
 * elsewhere in this codebase (`packages/api-client`) — kept here, not in
 * PHP, so there's one place that knows both the mapping and the actual
 * tag names, rather than risking drift between two codebases.
 */
const POST_TYPE_TAGS: Record<string, string> = {
  post: "posts",
  forum: "forums",
  topic: "forums",
  reply: "forums",
};

function isValidSecret(provided: string | null): boolean {
  const expected = process.env.REVALIDATE_SECRET;
  if (!expected || !provided) return false;
  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);
  // Buffers must be equal length for timingSafeEqual — a length mismatch
  // is itself not a secret worth timing-protecting, so compare length
  // first and only timing-safe-compare when it could plausibly match.
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(request: Request) {
  if (!isValidSecret(request.headers.get("x-revalidate-secret"))) {
    return NextResponse.json({ revalidated: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const postType = typeof body?.postType === "string" ? body.postType : null;
  const tag = postType ? POST_TYPE_TAGS[postType] : undefined;

  if (!tag) {
    // Not an error — WordPress's save_post fires for post types this
    // frontend doesn't cache at all (attachments, revisions, unrelated
    // CPTs) or a malformed body. Acknowledge without doing anything
    // rather than 400ing, so the WP plugin doesn't need its own allowlist
    // kept in sync with this one.
    return NextResponse.json({ revalidated: false, reason: "untracked post type" });
  }

  // { expire: 0 } — not "max" — because this call happens outside a
  // Server Action (a webhook calling a Route Handler), where updateTag()
  // isn't available; this is Next's own documented way to force an
  // immediate purge from here. "max" is for the Server-Action-after-a-
  // write case used everywhere else in this codebase (see DECISIONS.md),
  // which already gets read-your-own-writes some other way (an
  // accessToken → no-store read) and doesn't need this route at all.
  revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: true, tag });
}
