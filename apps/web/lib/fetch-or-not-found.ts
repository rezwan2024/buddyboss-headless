import { WpApiError } from "@buddyboss-headless/api-client";
import { notFound } from "next/navigation";

/**
 * BuddyBoss's single-item endpoints (members/{id}, groups/{id},
 * forums/{id}, topics/{id}) genuinely 404 for a nonexistent id — several
 * call sites' original comments assumed a 200-with-empty-body pattern
 * instead (confirmed true for list/search endpoints like the blog's
 * `?slug=`, NOT confirmed here — checked live via curl). A thread you
 * can't access 403s rather than 404s, which should still look like "not
 * found" to the viewer rather than a raw error page. Either way, the
 * un-caught `WpApiError` was bubbling to the route's generic `error.tsx`
 * instead of ever reaching the `if (!thing.id) notFound()` check below it,
 * which was dead code. Wrap the fetch with this so both become Next's real
 * not-found page instead.
 */
export async function fetchOrNotFound<T>(
  fetcher: () => Promise<T>,
  notFoundStatuses: number[] = [404],
): Promise<T> {
  try {
    return await fetcher();
  } catch (err) {
    if (err instanceof WpApiError && notFoundStatuses.includes(err.status)) notFound();
    throw err;
  }
}
