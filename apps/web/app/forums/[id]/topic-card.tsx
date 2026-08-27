import { decodeEntities, timeAgo } from "@/lib/format";
import type { TopicWithAuthor } from "@buddyboss-headless/api-client";
import Link from "next/link";
import AuthorAvatar from "../../author-avatar";

export default function TopicCard({
  forumId,
  topic,
}: {
  forumId: number;
  topic: TopicWithAuthor;
}) {
  return (
    <li>
      <Link
        href={`/forums/${forumId}/topics/${topic.id}`}
        className="flex items-center gap-3 rounded border border-black/10 p-3 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
      >
        <AuthorAvatar src={topic.author_avatar} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-black/80 dark:text-white/80">
            {decodeEntities(topic.title.rendered)}
          </p>
          <p className="truncate text-xs text-black/40 dark:text-white/40">
            {decodeEntities(topic.author_name)} · {timeAgo(topic.date)} · {topic.total_reply_count}{" "}
            repl{topic.total_reply_count === 1 ? "y" : "ies"}
          </p>
        </div>
      </Link>
    </li>
  );
}
