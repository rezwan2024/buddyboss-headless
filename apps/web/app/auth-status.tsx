"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "./auth-actions";

interface DisplayUser {
  id: number;
  name: string;
  mentionName: string;
}

// Deliberately client-side: reading the session server-side in the header
// (rendered on every page via the root layout) would force every route to
// render dynamically, losing ISR everywhere. hl_user is a non-httpOnly
// cookie set alongside the real (httpOnly) session tokens purely so this
// component can read it without a server round trip. Costs a brief flash
// of "logged out" before hydration — acceptable for a nav-bar indicator.
function readUserCookie(): DisplayUser | null {
  const match = document.cookie.match(/(?:^|; )hl_user=([^;]*)/);
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export default function AuthStatus() {
  const [user, setUser] = useState<DisplayUser | null | undefined>(undefined);
  const pathname = usePathname();

  // AuthStatus lives in the root layout, which App Router keeps mounted
  // across navigations — so a plain mount-only effect would never notice a
  // login that redirects from /login to /. Re-checking on every pathname
  // change catches that. It does NOT catch logout, which redirects back to
  // the same "/" it started from — handled instead by the optimistic
  // setUser(null) in the logout click handler below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a deliberate re-run trigger, not read in the body
  useEffect(() => {
    setUser(readUserCookie());
  }, [pathname]);

  if (user === undefined) return null; // not yet hydrated — avoid a flash of the wrong state

  if (!user) {
    return (
      <Link href="/login" className="hover:text-black dark:hover:text-white">
        Log in
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-2">
      <span>{user.name}</span>
      <form action={logoutAction}>
        <button
          type="submit"
          onClick={() => setUser(null)}
          className="hover:text-black dark:hover:text-white"
        >
          Log out
        </button>
      </form>
    </span>
  );
}
