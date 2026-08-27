"use client";

import { decodeEntities, timeAgo } from "@/lib/format";
import type { Member } from "@buddyboss-headless/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadMembersPage } from "../actions";

function MemberCard({ member }: { member: Member }) {
  return (
    <li>
      <Link
        href={member.link || "#"}
        className="flex items-center gap-3 rounded p-2 hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Image
          src={member.avatar_urls.thumb}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-black/80 dark:text-white/80">
            {decodeEntities(member.name)}
          </p>
          <p className="truncate text-xs text-black/40 dark:text-white/40">
            {member.last_activity
              ? `Active ${timeAgo(member.last_activity)}`
              : `@${member.user_login}`}
          </p>
        </div>
      </Link>
    </li>
  );
}

export interface MembersListProps {
  initialItems: Member[];
  initialTotal: number;
  initialPages: number;
}

export default function MembersList({
  initialItems,
  initialTotal,
  initialPages,
}: MembersListProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useInfiniteQuery({
    queryKey: ["members", debouncedSearch],
    queryFn: ({ pageParam }) => loadMembersPage(pageParam, debouncedSearch),
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
          placeholder="Search members…"
          className="w-full rounded border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
        />
      </div>
      <p className="mt-3 text-sm text-black/50 dark:text-white/50">
        {isFetching && items.length === 0
          ? "Searching…"
          : `${total} member${total === 1 ? "" : "s"}`}
      </p>
      {items.length === 0 && !isFetching ? (
        <p className="mt-8 text-black/50 dark:text-white/50">No members found.</p>
      ) : (
        <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {items.map((member) => (
            <MemberCard key={member.id} member={member} />
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
