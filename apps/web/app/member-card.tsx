import { decodeEntities, timeAgo } from "@/lib/format";
import type { Member } from "@buddyboss-headless/types";
import Image from "next/image";
import Link from "next/link";

export default function MemberCard({ member }: { member: Member }) {
  return (
    <li>
      <Link
        href={`/members/${member.id}`}
        className="flex items-center gap-3 rounded p-2 hover:bg-black/5 dark:hover:bg-white/5"
      >
        <Image
          src={member.avatar_urls.thumb}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-black/80 dark:text-white/80">
            {decodeEntities(member.name)}
          </p>
          <p className="truncate text-xs text-black/40 dark:text-white/40">
            {member.last_activity
              ? `Active ${timeAgo(member.last_activity)}`
              : `@${member.user_login}`}
          </p>
        </div>
      </Link>
    </li>
  );
}
