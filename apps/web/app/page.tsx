import { getAccessToken } from "@/lib/session";
import { getActivityFeed } from "@buddyboss-headless/api-client";
import ActivityComposer from "./activity-composer";
import ActivityFeedList from "./activity-feed-list";

const PER_PAGE = 20;

export default async function HomePage() {
  // Calling cookies() at all opts this whole route out of static
  // rendering/ISR, whether or not a session actually exists — that's
  // acceptable here since an authenticated feed genuinely differs per user
  // (private-network visibility, favorited state) and can never be a
  // shared cached shell. Every other list page avoids this by checking
  // auth client-side instead (see <AuthStatus>) and stays statically
  // cached. getActivityFeed itself still only skips its own revalidate: 30
  // tag-cache when an access token is actually present.
  const accessToken = await getAccessToken();
  const { items, total, pages } = await getActivityFeed({
    perPage: PER_PAGE,
    accessToken: accessToken ?? undefined,
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Activity feed</h1>
      <p className="mt-1 text-sm text-black/50 dark:text-white/50">{total} updates total</p>
      {accessToken && <ActivityComposer />}
      <ActivityFeedList initialItems={items} initialTotal={total} initialPages={pages} />
    </main>
  );
}
