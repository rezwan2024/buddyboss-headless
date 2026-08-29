"use client";

import type { Course } from "@buddyboss-headless/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { loadCoursesPage } from "../actions";
import CourseCard from "./course-card";

export interface CoursesListProps {
  initialItems: Course[];
  initialTotal: number;
  initialPages: number;
}

export default function CoursesList({
  initialItems,
  initialTotal,
  initialPages,
}: CoursesListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["courses"],
    queryFn: ({ pageParam }) => loadCoursesPage(pageParam),
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
    return <p className="mt-8 text-black/50 dark:text-white/50">No courses yet.</p>;
  }

  return (
    <>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((course) => (
          <CourseCard key={course.id} course={course} />
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
