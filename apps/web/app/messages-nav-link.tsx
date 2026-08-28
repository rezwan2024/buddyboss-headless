"use client";

import { useSessionUser } from "@/lib/use-session-user";
import Link from "next/link";

/**
 * Client-side, same reasoning as `<AuthStatus>`: reading the session
 * server-side in the header (rendered on every page via the root layout)
 * would force every route to render dynamically, losing ISR everywhere.
 */
export default function MessagesNavLink() {
  const isLoggedIn = Boolean(useSessionUser());
  if (!isLoggedIn) return null;

  return (
    <Link href="/messages" className="hover:text-black dark:hover:text-white">
      Messages
    </Link>
  );
}
