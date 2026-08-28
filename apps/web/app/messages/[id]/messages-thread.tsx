"use client";

import { decodeEntities, timeAgo } from "@/lib/format";
import type { Thread } from "@buddyboss-headless/types";
import { useQuery } from "@tanstack/react-query";
import { loadThread } from "../../actions";
import AuthorAvatar from "../../author-avatar";
import ReplyComposer from "./reply-composer";

export interface MessagesThreadProps {
  threadId: number;
  currentUserId: number;
  initialThread: Thread;
}

export default function MessagesThread({
  threadId,
  currentUserId,
  initialThread,
}: MessagesThreadProps) {
  const { data: thread } = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => loadThread(threadId),
    initialData: initialThread,
  });

  const messages = thread?.messages ?? initialThread.messages;

  return (
    <div>
      <ul className="mt-4 space-y-4">
        {messages.map((message) => {
          const isMine = message.sender_id === currentUserId;
          return (
            <li key={message.id} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
              <AuthorAvatar src={message.sender_data.user_avatars.thumb} size={28} />
              <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                <p className="text-xs text-black/60 dark:text-white/60">
                  {decodeEntities(message.sender_data.sender_name)} ·{" "}
                  {/* suppressHydrationWarning: timeAgo() reads Date.now() — see
                      activity-feed-list.tsx for the full reasoning. */}
                  <span suppressHydrationWarning>{timeAgo(message.date_sent)}</span>
                </p>
                <div
                  className={`prose prose-sm mt-0.5 max-w-none rounded px-3 py-2 text-sm ${
                    isMine
                      ? "bg-black text-white dark:bg-white dark:text-black"
                      : "bg-black/5 dark:bg-white/10"
                  }`}
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
                  dangerouslySetInnerHTML={{ __html: message.message.rendered }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <ReplyComposer threadId={threadId} />
    </div>
  );
}
