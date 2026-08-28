import { decodeEntities } from "@/lib/format";
import { getSiteInfo } from "@buddyboss-headless/api-client";
import Image from "next/image";
import Link from "next/link";
import AuthStatus from "./auth-status";
import MessagesNavLink from "./messages-nav-link";
import NotificationsNavLink from "./notifications-nav-link";

// No logo/site icon is configured on the dev site yet (site_icon_url comes
// back empty) — falls back to the site name as text branding. If a logo
// gets set later this picks it up with no code change.
export default async function SiteHeader() {
  const site = await getSiteInfo();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      {/* Full-width, not the max-w-2xl content column every page body uses
          below it — logo pinned to the left edge, nav centered in the
          available space, account menu pinned to the right edge (user
          feedback: everything was bunched together in a narrow centered
          column, leaving large empty margins on wide screens). A 3-column
          grid (not flex justify-between) is what actually centers the nav
          independent of how wide the logo/account cell each are. */}
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 px-8 py-3">
        <Link href="/" className="flex items-center gap-2 justify-self-start font-semibold">
          {site.site_icon_url && (
            <Image
              src={site.site_icon_url}
              alt=""
              width={24}
              height={24}
              className="h-6 w-6 rounded"
            />
          )}
          <span>{decodeEntities(site.name) || "BuddyBoss Headless"}</span>
        </Link>
        <nav className="flex justify-self-center gap-4 text-black/60 dark:text-white/60">
          <Link href="/" className="hover:text-black dark:hover:text-white">
            Activity
          </Link>
          <Link href="/members" className="hover:text-black dark:hover:text-white">
            Members
          </Link>
          <Link href="/groups" className="hover:text-black dark:hover:text-white">
            Groups
          </Link>
          <Link href="/forums" className="hover:text-black dark:hover:text-white">
            Forums
          </Link>
          <Link href="/blog" className="hover:text-black dark:hover:text-white">
            Blog
          </Link>
          <MessagesNavLink />
          <NotificationsNavLink />
        </nav>
        <div className="justify-self-end">
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
