"use client";

import { decodeEntities, timeAgo } from "@/lib/format";
import type { Activity } from "@buddyboss-headless/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { loadActivityPage } from "./actions";

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

export interface ActivityFeedListProps {
  initialItems: Activity[];
  initialTotal: number;
  initialPages: number;
}

export default function ActivityFeedList({
  initialItems,
  initialTotal,
  initialPages,
}: ActivityFeedListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["activity-feed"],
    queryFn: ({ pageParam }) => loadActivityPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (_lastPage, allPages) =>
      allPages.length < initialPages ? allPages.length + 1 : undefined,
    initialData: {
      pages: [{ items: initialItems, total: initialTotal, pages: initialPages }],
      pageParams: [1],
    },
  });

  const items = data.pages.flatMap((page) => page.items);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  if (items.length === 0) {
    return <p className="mt-8 text-black/50 dark:text-white/50">No activity yet.</p>;
  }

  return (
    <>
      <ul className="mt-6">
        {items.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </ul>
      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {isFetchingNextPage && (
            <span className="text-sm text-black/50 dark:text-white/50">Loading…</span>
          )}
        </div>
      )}
    </>
  );
}
