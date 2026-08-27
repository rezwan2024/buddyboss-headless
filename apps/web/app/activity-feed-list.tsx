"use client";

import { decodeEntities, parseReactedNames, timeAgo } from "@/lib/format";
import type { Activity } from "@buddyboss-headless/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { loadActivityPage } from "./actions";
import ActivityComments from "./activity-comments";

function ThumbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6 8.5H3.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1H6v-8Zm1.5 8h6.24a2 2 0 0 0 1.96-1.6l1.1-5.5A1.5 1.5 0 0 0 15.34 7.5H11.5V4.75A1.75 1.75 0 0 0 9.75 3a.75.75 0 0 0-.7.48L7.5 8.06v8.44Z" />
    </svg>
  );
}

function LikesButton({ activity }: { activity: Activity }) {
  const [open, setOpen] = useState(false);
  const names = parseReactedNames(activity.reacted_names);

  if (activity.favorite_count === 0) {
    return (
      <span className="inline-flex items-center gap-1">
        <ThumbIcon className="h-3 w-3" />0 likes
      </span>
    );
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
      >
        <ThumbIcon className="h-3 w-3" />
        {activity.favorite_count} likes
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-0 z-20 mb-1 w-max max-w-56 rounded border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-neutral-900">
            {names.length > 0 ? (
              names.map((name) => (
                <p key={name} className="text-black/70 dark:text-white/70">
                  {name}
                </p>
              ))
            ) : (
              <p className="text-black/50 dark:text-white/50">Liked by {activity.favorite_count}</p>
            )}
          </div>
        </>
      )}
    </span>
  );
}

function ActivityItem({ activity }: { activity: Activity }) {
  const [commentsOpen, setCommentsOpen] = useState(false);

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
          <div className="mt-1 flex items-center gap-1 text-xs text-black/40 dark:text-white/40">
            {activity.comment_count > 0 ? (
              <button
                type="button"
                onClick={() => setCommentsOpen((open) => !open)}
                className="underline-offset-2 hover:underline"
              >
                {activity.comment_count} comments
              </button>
            ) : (
              <span>0 comments</span>
            )}
            <span>·</span>
            <LikesButton activity={activity} />
          </div>
          {commentsOpen && <ActivityComments activityId={activity.id} />}
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
