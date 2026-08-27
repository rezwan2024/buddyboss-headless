import { decodeEntities } from "@/lib/format";
import type { Group } from "@buddyboss-headless/types";
import Image from "next/image";
import Link from "next/link";

export default function GroupCard({ group }: { group: Group }) {
  return (
    <li>
      <Link
        href={`/groups/${group.id}`}
        className="flex items-center gap-3 rounded border border-black/10 p-3 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
      >
        <Image
          src={group.avatar_urls.thumb}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-black/80 dark:text-white/80">
            {decodeEntities(group.name)}
          </p>
          <p className="truncate text-xs text-black/40 dark:text-white/40">
            {group.members_count} member{group.members_count === 1 ? "" : "s"}
          </p>
        </div>
      </Link>
    </li>
  );
}
