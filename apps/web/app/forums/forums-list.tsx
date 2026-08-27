"use client";

import type { Forum } from "@buddyboss-headless/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { loadForumsPage } from "../actions";
import ForumCard from "./forum-card";

export interface ForumsListProps {
  initialItems: Forum[];
  initialTotal: number;
  initialPages: number;
}

export default function ForumsList({ initialItems, initialTotal, initialPages }: ForumsListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["forums"],
    queryFn: ({ pageParam }) => loadForumsPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.pages ? allPages.length + 1 : undefined,
    initialData: {
      pages: [{ items: initialItems, total: initialTotal, pages: initialPages }],
      pageParams: [1],
    },
  });

  const items = data.pages.flatMap((page) => page.items);
  const total = data.pages[0]?.total ?? initialTotal;
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

  return (
    <>
      <p className="mt-1 text-sm text-black/50 dark:text-white/50">
        {total} forum{total === 1 ? "" : "s"}
      </p>
      {items.length === 0 ? (
        <p className="mt-8 text-black/50 dark:text-white/50">No forums yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((forum) => (
            <ForumCard key={forum.id} forum={forum} />
          ))}
        </ul>
      )}
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
