import { decodeEntities, timeAgo } from "@/lib/format";
import { getRecentTopics } from "@buddyboss-headless/api-client";
import Link from "next/link";

/** Left sidebar, activity home page only — the 5 most recently active
 * forum topics site-wide, not scoped to any one forum. */
export default async function HomeLatestDiscussionsCard() {
  const { items } = await getRecentTopics({ perPage: 5 });
  if (items.length === 0) return null;

  return (
    <div className="rounded border border-black/10 p-4 dark:border-white/10">
      <h2 className="text-sm font-semibold">Latest Discussions</h2>
      <ul className="mt-3 space-y-3">
        {items.map((topic) => (
          <li key={topic.id}>
            <Link
              href={`/forums/${topic.forum_id}/topics/${topic.id}`}
              className="block text-sm hover:underline"
            >
              {decodeEntities(topic.title.rendered) || "(untitled)"}
            </Link>
            <p className="text-xs text-black/50 dark:text-white/50">{timeAgo(topic.date)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
