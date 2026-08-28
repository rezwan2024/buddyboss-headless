"use client";

import { useSessionUser } from "@/lib/use-session-user";
import Link from "next/link";

/**
 * Client-side, same reasoning as `<AuthStatus>`: reading the session
 * server-side in the header (rendered on every page via the root layout)
 * would force every route to render dynamically, losing ISR everywhere.
 * Icon-only, matching the account menu trigger's style — sits directly
 * beside it in the header's right-hand group, not in the centered nav.
 */
export default function MessagesNavLink() {
  const isLoggedIn = Boolean(useSessionUser());
  if (!isLoggedIn) return null;

  return (
    <Link
      href="/messages"
      aria-label="Messages"
      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-black/60 hover:bg-black/20 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5">
        <path d="M3 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8.5l-3.9 3.12A.8.8 0 0 1 3.3 16.5V14a2 2 0 0 1-.3-1.06V5Z" />
      </svg>
    </Link>
  );
}
