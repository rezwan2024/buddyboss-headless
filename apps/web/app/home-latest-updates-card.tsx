import { decodeEntities, timeAgo } from "@/lib/format";
import type { Activity } from "@buddyboss-headless/types";
import Link from "next/link";
import AuthorAvatar from "./author-avatar";

/**
 * Right sidebar, activity home page only — a compact digest of the most
 * recent activity items. Takes items as a prop rather than fetching its
 * own — `page.tsx` already fetches the first page of the exact same feed
 * for the center column, so a second independent WP call here would be
 * pure duplicate live-network cost for data the page already has.
 */
export default function HomeLatestUpdatesCard({ items }: { items: Activity[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded border border-black/10 p-4 dark:border-white/10">
      <h2 className="text-sm font-semibold">Latest updates</h2>
      <ul className="mt-3 space-y-3">
        {items.map((activity) => (
          <li key={activity.id} className="flex gap-2">
            <AuthorAvatar src={activity.user_avatar.thumb} size={28} />
            <div className="min-w-0">
              <Link
                href={`/members/${activity.user_id}`}
                className="text-sm font-medium hover:underline"
              >
                {decodeEntities(activity.name)}
              </Link>{" "}
              <span className="text-sm text-black/60 dark:text-white/60">
                {activity.content_stripped
                  ? decodeEntities(activity.content_stripped).slice(0, 60)
                  : "posted an update"}
              </span>
              <p className="text-xs text-black/50 dark:text-white/50">{timeAgo(activity.date)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
