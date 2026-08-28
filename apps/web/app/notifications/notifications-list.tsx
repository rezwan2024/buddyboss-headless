"use client";

import { stripTags, timeAgo } from "@/lib/format";
import type { Notification } from "@buddyboss-headless/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadNotificationsPage } from "../actions";
import AuthorAvatar from "../author-avatar";
import { markNotificationReadAction } from "../notification-action";

export interface NotificationsListProps {
  initialItems: Notification[];
  initialTotal: number;
  initialPages: number;
}

function NotificationCard({ notification }: { notification: Notification }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  function markRead() {
    setError(null);
    startTransition(async () => {
      const result = await markNotificationReadAction(notification.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // The list is unread-only by default, so a read notification drops
      // out of it — refetch rather than patch it in place.
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    });
  }

  return (
    <li className="flex items-start gap-3 border-b border-black/10 py-3 dark:border-white/10">
      <AuthorAvatar src={notification.avatar_urls.thumb} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{stripTags(notification.description.rendered)}</p>
        {/* suppressHydrationWarning: timeAgo() reads Date.now() — see
            activity-feed-list.tsx for the full reasoning. */}
        <p className="mt-0.5 text-xs text-black/60 dark:text-white/60" suppressHydrationWarning>
          {timeAgo(notification.date)}
        </p>
        {error && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
      </div>
      <button
        type="button"
        onClick={markRead}
        disabled={isPending}
        className="shrink-0 rounded border border-black/20 px-2 py-1 text-xs font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
      >
        {isPending ? "Marking…" : "Mark as read"}
      </button>
    </li>
  );
}

export default function NotificationsList({
  initialItems,
  initialTotal,
  initialPages,
}: NotificationsListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) => loadNotificationsPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (_lastPage, allPages) =>
      allPages.length < allPages[allPages.length - 1].pages ? allPages.length + 1 : undefined,
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
    return <p className="mt-8 text-black/50 dark:text-white/50">No unread notifications.</p>;
  }

  return (
    <>
      <ul className="mt-4">
        {items.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} />
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
