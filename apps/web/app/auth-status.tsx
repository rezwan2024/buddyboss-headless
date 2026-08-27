"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
  const [isLoggingOut, startLogout] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  // AuthStatus lives in the root layout, which App Router keeps mounted
  // across navigations — so a plain mount-only effect would never notice a
  // login that redirects from /login to /. Re-checking on every pathname
  // change catches that. It does NOT catch logout, which stays on the same
  // "/" it started from — handled instead in handleLogout below.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is a deliberate re-run trigger, not read in the body
  useEffect(() => {
    setUser(readUserCookie());
  }, [pathname]);

  function handleLogout() {
    // Calling the action directly (not via a plain `<form action>`) so we
    // control exactly when local state updates relative to the request.
    // An earlier version set state synchronously in the button's onClick —
    // that unmounted this component's own <form> mid-submission (the
    // browser was still processing the native submit when React's
    // re-render tore the form out of the DOM), so the browser silently
    // canceled the request and logout never actually happened. Updating
    // state only after the action's promise resolves avoids that race.
    startLogout(async () => {
      await logoutAction();
      setUser(null);
      router.refresh(); // re-fetch server-rendered data (e.g. "/") as anonymous
    });
  }

  if (user === undefined) return null; // not yet hydrated — avoid a flash of the wrong state

  if (!user) {
    return (
      <Link href="/login" className="hover:text-black dark:hover:text-white">
        Log in
      </Link>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={`Account menu for ${user.name}`}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 text-black/60 hover:bg-black/20 dark:bg-white/10 dark:text-white/60 dark:hover:bg-white/20"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="h-5 w-5">
          <path d="M10 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
        </svg>
      </button>
      {/* No gap between trigger and panel (top-full, no margin) so hover
          doesn't drop out while the pointer crosses between them. */}
      <div className="invisible absolute right-0 top-full z-20 w-40 pt-1 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
        <div className="overflow-hidden rounded border border-black/10 bg-white text-sm shadow-lg dark:border-white/10 dark:bg-neutral-900">
          <p className="truncate border-b border-black/10 px-3 py-2 font-medium text-black/80 dark:border-white/10 dark:text-white/80">
            {user.name}
          </p>
          <Link
            href={`/members/${user.id}`}
            className="block px-3 py-2 text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="block w-full px-3 py-2 text-left text-black/70 hover:bg-black/5 disabled:opacity-50 dark:text-white/70 dark:hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
