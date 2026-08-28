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

/**
 * Icon-only, matching the account menu trigger's style — sits directly
 * beside it (and the messages icon) in the header's right-hand group,
 * not in the centered nav. Unread count overlays the icon as a badge
 * instead of trailing text next to it.
 */
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
    <Link
      href="/notifications"
      aria-label="Notifications"
      className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-black/60 hover:bg-black/20 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5">
        <path d="M10 2a6 6 0 0 0-6 6v3.09c0 .5-.2.99-.55 1.35L2.3 13.6c-.57.58-.16 1.57.65 1.57h14.1c.81 0 1.22-.99.65-1.57l-1.15-1.16A1.9 1.9 0 0 1 16 11.09V8a6 6 0 0 0-6-6Zm0 16.5a2.25 2.25 0 0 0 2.24-2h-4.48A2.25 2.25 0 0 0 10 18.5Z" />
      </svg>
      {Boolean(unreadCount) && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-medium text-white dark:bg-blue-400 dark:text-black">
          {unreadCount}
        </span>
      )}
    </Link>
  );
}
