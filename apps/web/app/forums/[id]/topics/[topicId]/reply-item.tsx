import { decodeEntities, timeAgo } from "@/lib/format";
import type { ReplyWithAuthor } from "@buddyboss-headless/api-client";
import AuthorAvatar from "../../../../author-avatar";

export default function ReplyItem({ reply }: { reply: ReplyWithAuthor }) {
  return (
    <li
      className="flex gap-3 border-b border-black/10 py-4 last:border-0 dark:border-white/10"
      style={{ marginLeft: `${Math.max(0, reply.depth - 1) * 20}px` }}
    >
      <AuthorAvatar src={reply.author_avatar} size={36} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-black/70 dark:text-white/70">
          {decodeEntities(reply.author_name)}{" "}
          <span className="text-black/40 dark:text-white/40">· {timeAgo(reply.date)}</span>
        </p>
        {reply.content.rendered && (
          <div
            className="prose prose-sm mt-1 max-w-none"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
            dangerouslySetInnerHTML={{ __html: reply.content.rendered }}
          />
        )}
      </div>
    </li>
  );
}
