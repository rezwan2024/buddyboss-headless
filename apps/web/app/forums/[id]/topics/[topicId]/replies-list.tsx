"use client";

import type { ReplyWithAuthor } from "@buddyboss-headless/api-client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { loadRepliesPage } from "../../../../actions";
import ReplyItem from "./reply-item";

export interface RepliesListProps {
  topicId: number;
  initialItems: ReplyWithAuthor[];
  initialTotal: number;
  initialPages: number;
}

export default function RepliesList({
  topicId,
  initialItems,
  initialTotal,
  initialPages,
}: RepliesListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["replies", topicId],
    queryFn: ({ pageParam }) => loadRepliesPage(topicId, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.pages ? allPages.length + 1 : undefined,
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
    return <p className="mt-2 text-sm text-black/50 dark:text-white/50">No replies yet.</p>;
  }

  return (
    <>
      <ul className="mt-2">
        {items.map((reply) => (
          <ReplyItem key={reply.id} reply={reply} />
        ))}
      </ul>
      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          {isFetchingNextPage && (
            <span className="text-sm text-black/50 dark:text-white/50">Loading…</span>
          )}
        </div>
      )}
    </>
  );
}
