"use client";

import { decodeEntities, timeAgo } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { loadActivityComments } from "./actions";

export default function ActivityComments({ activityId }: { activityId: number }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ["activity-comments", activityId],
    queryFn: () => loadActivityComments(activityId),
  });

  if (isPending) {
    return <p className="mt-3 text-sm text-black/50 dark:text-white/50">Loading comments…</p>;
  }

  if (isError) {
    return <p className="mt-3 text-sm text-red-700 dark:text-red-400">Couldn't load comments.</p>;
  }

  if (data.comments.length === 0) {
    return <p className="mt-3 text-sm text-black/50 dark:text-white/50">No comments yet.</p>;
  }

  return (
    <ul className="mt-3 space-y-3 border-l border-black/10 pl-3 dark:border-white/10">
      {data.comments.map((comment) => (
        <li key={comment.id} className="flex gap-2">
          <Image
            src={comment.user_avatar.thumb}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded-full object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-black/70 dark:text-white/70">
              {decodeEntities(comment.name)}{" "}
              <span className="text-black/40 dark:text-white/40">· {timeAgo(comment.date)}</span>
            </p>
            {comment.content.rendered && (
              <div
                className="prose prose-sm mt-0.5 max-w-none text-sm"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
                dangerouslySetInnerHTML={{ __html: comment.content.rendered }}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
