"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export interface SessionUser {
  id: number;
  name: string;
  mentionName: string;
}

// Deliberately client-side: reading the session server-side (e.g. in the
// header, rendered on every page via the root layout) would force every
// route to render dynamically, losing ISR everywhere. hl_user is a
// non-httpOnly cookie set alongside the real (httpOnly) session tokens
// purely so client code can read it without a server round trip. Costs a
// brief flash of "logged out" before hydration — acceptable for UI that
// only needs to know "is someone logged in", not the tokens themselves.
function readUserCookie(): SessionUser | null {
  const match = document.cookie.match(/(?:^|; )hl_user=([^;]*)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

/**
 * `undefined` before hydration, then the logged-in user or `null`.
 * Re-checks on every pathname change — this component may stay mounted
 * across a navigation that logs the user in (e.g. redirect from /login),
 * which a mount-only effect would miss.
 */
export function useSessionUser(): SessionUser | null | undefined {
  const [user, setUser] = useState<SessionUser | null | undefined>(undefined);
  const pathname = usePathname();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a deliberate re-run trigger, not read in the body
  useEffect(() => {
    setUser(readUserCookie());
  }, [pathname]);

  return user;
}
