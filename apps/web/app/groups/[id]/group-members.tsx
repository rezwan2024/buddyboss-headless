"use client";

import type { Member } from "@buddyboss-headless/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { loadGroupMembersPage } from "../../actions";
import MemberCard from "../../member-card";

export interface GroupMembersProps {
  groupId: number;
  initialItems: Member[];
  initialTotal: number;
  initialPages: number;
}

export default function GroupMembers({
  groupId,
  initialItems,
  initialTotal,
  initialPages,
}: GroupMembersProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["group-members", groupId],
    queryFn: ({ pageParam }) => loadGroupMembersPage(groupId, pageParam),
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
    return <p className="mt-2 text-sm text-black/50 dark:text-white/50">No members yet.</p>;
  }

  return (
    <>
      <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {items.map((member) => (
          <MemberCard key={member.id} member={member} />
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
