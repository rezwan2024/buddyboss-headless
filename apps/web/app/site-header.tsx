import { decodeEntities } from "@/lib/format";
import { getSiteInfo } from "@buddyboss-headless/api-client";
import Image from "next/image";
import Link from "next/link";
import AuthStatus from "./auth-status";

// No logo/site icon is configured on the dev site yet (site_icon_url comes
// back empty) — falls back to the site name as text branding. If a logo
// gets set later this picks it up with no code change.
export default async function SiteHeader() {
  const site = await getSiteInfo();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
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
        <nav className="flex gap-4 text-sm text-black/60 dark:text-white/60">
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
          <AuthStatus />
        </nav>
      </div>
    </header>
  );
}
