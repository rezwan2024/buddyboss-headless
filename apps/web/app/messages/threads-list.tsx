"use client";

import { decodeEntities, timeAgo } from "@/lib/format";
import type { Thread } from "@buddyboss-headless/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { loadThreadsPage } from "../actions";
import AuthorAvatar from "../author-avatar";

export interface ThreadsListProps {
  currentUserId: number;
  initialItems: Thread[];
  initialTotal: number;
  initialPages: number;
}

/** The other participant(s) — everyone in `recipients` except the current viewer. */
function otherParticipants(thread: Thread, currentUserId: number) {
  return Object.values(thread.recipients).filter((r) => r.user_id !== currentUserId);
}

function ThreadCard({ thread, currentUserId }: { thread: Thread; currentUserId: number }) {
  const others = otherParticipants(thread, currentUserId);
  const name = others.map((r) => decodeEntities(r.name)).join(", ") || "Deleted member";
  const unread = thread.unread_count > 0;

  return (
    <li>
      <Link
        href={`/messages/${thread.id}`}
        className="flex items-center gap-3 border-b border-black/10 py-3 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
      >
        <AuthorAvatar src={others[0]?.user_avatars.thumb ?? ""} size={40} />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm ${unread ? "font-semibold" : ""}`}>{name}</p>
          <p className="truncate text-sm text-black/50 dark:text-white/50">
            {decodeEntities(thread.excerpt.rendered)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {/* suppressHydrationWarning: timeAgo() reads Date.now() — see
              activity-feed-list.tsx for the full reasoning. */}
          <span className="text-xs text-black/60 dark:text-white/60" suppressHydrationWarning>
            {timeAgo(thread.date)}
          </span>
          {unread && <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />}
        </div>
      </Link>
    </li>
  );
}

export default function ThreadsList({
  currentUserId,
  initialItems,
  initialTotal,
  initialPages,
}: ThreadsListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["threads", currentUserId],
    queryFn: ({ pageParam }) => loadThreadsPage(currentUserId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (_lastPage, allPages) =>
      allPages.length < initialPages ? allPages.length + 1 : undefined,
    initialData: {
      pages: [{ items: initialItems, total: initialTotal, pages: initialPages, unreadCount: 0 }],
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
    return <p className="mt-8 text-black/50 dark:text-white/50">No conversations yet.</p>;
  }

  return (
    <>
      <ul className="mt-4">
        {items.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} currentUserId={currentUserId} />
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
