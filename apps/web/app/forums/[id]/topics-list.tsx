"use client";

import type { TopicWithAuthor } from "@buddyboss-headless/api-client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { loadTopicsPage } from "../../actions";
import TopicCard from "./topic-card";

export interface TopicsListProps {
  forumId: number;
  initialItems: TopicWithAuthor[];
  initialTotal: number;
  initialPages: number;
}

export default function TopicsList({
  forumId,
  initialItems,
  initialTotal,
  initialPages,
}: TopicsListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["topics", forumId],
    queryFn: ({ pageParam }) => loadTopicsPage(forumId, pageParam),
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
    return <p className="mt-2 text-sm text-black/50 dark:text-white/50">No topics yet.</p>;
  }

  return (
    <>
      <ul className="mt-2 space-y-2">
        {items.map((topic) => (
          <TopicCard key={topic.id} forumId={forumId} topic={topic} />
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
