"use client";

import type { Group } from "@buddyboss-headless/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { loadGroupsPage } from "../actions";
import GroupCard from "./group-card";

export interface GroupsListProps {
  initialItems: Group[];
  initialTotal: number;
  initialPages: number;
}

export default function GroupsList({ initialItems, initialTotal, initialPages }: GroupsListProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useInfiniteQuery({
    queryKey: ["groups", debouncedSearch],
    queryFn: ({ pageParam }) => loadGroupsPage(pageParam, debouncedSearch),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) =>
      allPages.length < lastPage.pages ? allPages.length + 1 : undefined,
    initialData:
      debouncedSearch === ""
        ? {
            pages: [{ items: initialItems, total: initialTotal, pages: initialPages }],
            pageParams: [1],
          }
        : undefined,
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? initialTotal;
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
      <div className="mt-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups…"
          className="w-full rounded border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
        />
      </div>
      <p className="mt-3 text-sm text-black/50 dark:text-white/50">
        {isFetching && items.length === 0
          ? "Searching…"
          : `${total} group${total === 1 ? "" : "s"}`}
      </p>
      {items.length === 0 && !isFetching ? (
        <p className="mt-8 text-black/50 dark:text-white/50">No groups found.</p>
      ) : (
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((group) => (
            <GroupCard key={group.id} group={group} />
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
