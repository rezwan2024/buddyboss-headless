"use client";

import { useSessionUser } from "@/lib/use-session-user";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { loadUnreadNotificationCount } from "./actions";

/**
 * Polling, not real-time — `PLAN.md`'s Phase 5 scope is explicitly
 * "polling first, real-time only if it proves necessary." 60s keeps the
 * badge reasonably fresh without hammering the WP host on every render.
 */
const POLL_INTERVAL_MS = 60_000;

export default function NotificationsNavLink() {
  const isLoggedIn = Boolean(useSessionUser());
  const { data: unreadCount } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: loadUnreadNotificationCount,
    enabled: isLoggedIn,
    refetchInterval: POLL_INTERVAL_MS,
  });

  if (!isLoggedIn) return null;

  return (
    <Link href="/notifications" className="relative hover:text-black dark:hover:text-white">
      Notifications
      {Boolean(unreadCount) && (
        <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-medium text-white dark:bg-blue-400 dark:text-black">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
