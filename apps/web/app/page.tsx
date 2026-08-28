import { getAccessToken } from "@/lib/session";
import { getActivityFeed } from "@buddyboss-headless/api-client";
import { Suspense } from "react";
import ActivityComposer from "./activity-composer";
import ActivityFeedList from "./activity-feed-list";
import HomeLatestDiscussionsCard from "./home-latest-discussions-card";
import HomeLatestUpdatesCard from "./home-latest-updates-card";
import HomeMyGroupsCard from "./home-my-groups-card";
import HomeProfileCompletionCard from "./home-profile-completion-card";
import HomeSidebarCardSkeleton from "./home-sidebar-card-skeleton";

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
    // 3-column dashboard layout (left sidebar / feed / right sidebar),
    // matching the reference BuddyBoss community site's home page — every
    // other list page in this app stays a single centered max-w-2xl
    // column, this is deliberately just for the activity home page. Both
    // sidebars are hidden below `lg` rather than squeezed or wrapped —
    // this app has no other responsive multi-column layout yet to match
    // against, and hiding is safer than an untested cramped layout.
    //
    // Each sidebar card is its own Suspense boundary: without one, Next
    // waits for every card's data (recent topics, the user's groups,
    // profile completeness, latest updates — 4 extra fetches beyond the
    // feed itself) before sending any HTML, so the whole page's TTFB was
    // gated on the slowest sidebar call. Streaming each independently
    // means the feed (this page's actual point) renders as soon as its
    // own fetch resolves, same as before this page had sidebars at all.
    <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-8">
      <aside className="hidden w-64 shrink-0 space-y-4 lg:block">
        <Suspense fallback={<HomeSidebarCardSkeleton />}>
          <HomeLatestDiscussionsCard />
        </Suspense>
        <Suspense fallback={<HomeSidebarCardSkeleton />}>
          <HomeMyGroupsCard />
        </Suspense>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-xl font-semibold">Activity feed</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">{total} updates total</p>
          {accessToken && <ActivityComposer />}
          <ActivityFeedList initialItems={items} initialTotal={total} initialPages={pages} />
        </div>
      </main>
      <aside className="hidden w-72 shrink-0 space-y-4 lg:block">
        <Suspense fallback={<HomeSidebarCardSkeleton />}>
          <HomeProfileCompletionCard />
        </Suspense>
        <HomeLatestUpdatesCard items={items.slice(0, 5)} />
      </aside>
    </div>
  );
}
