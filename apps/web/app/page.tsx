import { decodeEntities, timeAgo } from "@/lib/format";
import { getActivityFeed } from "@buddyboss-headless/api-client";
import type { Activity } from "@buddyboss-headless/types";
import Image from "next/image";

function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <li className="border-b border-black/10 py-4 last:border-0 dark:border-white/10">
      <div className="flex gap-3">
        <Image
          src={activity.user_avatar.thumb}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-black/70 dark:text-white/70">
            {decodeEntities(activity.name)}{" "}
            <span className="text-black/40 dark:text-white/40">· {timeAgo(activity.date)}</span>
          </p>
          {activity.content.rendered && (
            <div
              className="prose prose-sm mt-1 max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
              dangerouslySetInnerHTML={{ __html: activity.content.rendered }}
            />
          )}
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            {activity.comment_count} comments · {activity.favorite_count} favorites
          </p>
        </div>
      </div>
    </li>
  );
}

export default async function HomePage() {
  const { items, total } = await getActivityFeed({ perPage: 20 });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Activity feed</h1>
      <p className="mt-1 text-sm text-black/50 dark:text-white/50">{total} updates total</p>
      {items.length === 0 ? (
        <p className="mt-8 text-black/50 dark:text-white/50">No activity yet.</p>
      ) : (
        <ul className="mt-6">
          {items.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </ul>
      )}
    </main>
  );
}
