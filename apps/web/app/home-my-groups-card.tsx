import { decodeEntities } from "@/lib/format";
import { getAccessToken, getSessionUser } from "@/lib/session";
import { getGroups } from "@buddyboss-headless/api-client";
import Link from "next/link";
import AuthorAvatar from "./author-avatar";

/** Left sidebar, activity home page only — the logged-in user's own
 * joined groups. Renders nothing when logged out (no "my groups" to show). */
export default async function HomeMyGroupsCard() {
  const accessToken = await getAccessToken();
  const user = await getSessionUser();
  if (!accessToken || !user) return null;

  const { items } = await getGroups({ userId: user.id, accessToken, perPage: 5 });
  if (items.length === 0) return null;

  return (
    <div className="rounded border border-black/10 p-4 dark:border-white/10">
      <h2 className="text-sm font-semibold">Groups</h2>
      <ul className="mt-3 space-y-3">
        {items.map((group) => (
          <li key={group.id}>
            <Link href={`/groups/${group.id}`} className="flex items-center gap-2 hover:underline">
              <AuthorAvatar src={group.avatar_urls.thumb} size={24} />
              <span className="truncate text-sm">{decodeEntities(group.name)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
