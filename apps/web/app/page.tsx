import { getActivityFeed } from "@buddyboss-headless/api-client";
import ActivityFeedList from "./activity-feed-list";

const PER_PAGE = 20;

export default async function HomePage() {
  const { items, total, pages } = await getActivityFeed({ perPage: PER_PAGE });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Activity feed</h1>
      <p className="mt-1 text-sm text-black/50 dark:text-white/50">{total} updates total</p>
      <ActivityFeedList initialItems={items} initialTotal={total} initialPages={pages} />
    </main>
  );
}
