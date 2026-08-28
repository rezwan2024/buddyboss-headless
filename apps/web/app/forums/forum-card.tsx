import { decodeEntities } from "@/lib/format";
import type { Forum } from "@buddyboss-headless/types";
import Link from "next/link";

export default function ForumCard({ forum }: { forum: Forum }) {
  return (
    <li>
      <Link
        href={`/forums/${forum.id}`}
        className="block rounded border border-black/10 p-3 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
      >
        <p className="text-sm font-medium text-black/80 dark:text-white/80">
          {decodeEntities(forum.title.rendered)}
        </p>
        <p className="mt-1 text-xs text-black/60 dark:text-white/60">
          {forum.total_topic_count} topic{forum.total_topic_count === 1 ? "" : "s"} ·{" "}
          {forum.total_reply_count} repl{forum.total_reply_count === 1 ? "y" : "ies"}
        </p>
      </Link>
    </li>
  );
}
