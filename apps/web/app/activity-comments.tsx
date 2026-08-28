"use client";

import { decodeEntities, timeAgo } from "@/lib/format";
import type { Activity } from "@buddyboss-headless/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useActionState, useEffect, useRef } from "react";
import { loadActivityComments } from "./actions";
import { type PostCommentState, postCommentAction } from "./comment-action";

const initialCommentState: PostCommentState = {};

function CommentThread({ comments }: { comments: Activity[] }) {
  return (
    <ul className="mt-3 space-y-3 border-l border-black/10 pl-3 dark:border-white/10">
      {comments.map((comment) => (
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
              {/* suppressHydrationWarning: timeAgo() reads Date.now(), which can
                  legitimately differ between the server-rendered and hydration-time
                  string — see activity-feed-list.tsx for the full reasoning. */}
              <span className="text-black/60 dark:text-white/60" suppressHydrationWarning>
                · {timeAgo(comment.date)}
              </span>
            </p>
            {comment.content.rendered && (
              <div
                className="prose prose-sm mt-0.5 max-w-none text-sm"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
                dangerouslySetInnerHTML={{ __html: comment.content.rendered }}
              />
            )}
            {/* Replies to this comment come nested under the same `comments`
                key it was itself found under — recurse to render them. */}
            {comment.comments && comment.comments.length > 0 && (
              <CommentThread comments={comment.comments} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

interface CommentComposerProps {
  activityId: number;
  onPosted: () => void;
}

function CommentComposer({ activityId, onPosted }: CommentComposerProps) {
  const boundAction = postCommentAction.bind(null, activityId);
  const [state, formAction, pending] = useActionState(boundAction, initialCommentState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    onPosted();
    // Depending on `state` (not `state.success`): useActionState returns a
    // new object each dispatch, but `.success` alone would stay `true`
    // across two comments posted in a row in the same mount, silently
    // skipping this effect the second time — see activity-composer.tsx for
    // where this was first caught.
  }, [state, onPosted]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 flex gap-2">
      <input
        name="content"
        type="text"
        placeholder="Write a comment…"
        className="min-w-0 flex-1 rounded border border-black/10 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-black/40 dark:border-white/10 dark:placeholder:text-white/40"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded bg-black px-3 py-1 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Posting…" : "Reply"}
      </button>
      {state.error && <p className="text-xs text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}

interface ActivityCommentsProps {
  activityId: number;
  /** Comment composer only shows when logged in — see activity-feed-list.tsx. */
  isLoggedIn: boolean;
}

export default function ActivityComments({ activityId, isLoggedIn }: ActivityCommentsProps) {
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery({
    queryKey: ["activity-comments", activityId],
    queryFn: () => loadActivityComments(activityId),
  });

  function handlePosted() {
    queryClient.invalidateQueries({ queryKey: ["activity-comments", activityId] });
    // Also refreshes the feed's own comment_count badge, not just the thread.
    queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
  }

  return (
    <div>
      {isPending && (
        <p className="mt-3 text-sm text-black/50 dark:text-white/50">Loading comments…</p>
      )}
      {isError && (
        <p className="mt-3 text-sm text-red-700 dark:text-red-400">Couldn't load comments.</p>
      )}
      {!isPending && !isError && data.comments.length === 0 && (
        <p className="mt-3 text-sm text-black/50 dark:text-white/50">No comments yet.</p>
      )}
      {!isPending && !isError && data.comments.length > 0 && (
        <CommentThread comments={data.comments} />
      )}
      {isLoggedIn && <CommentComposer activityId={activityId} onPosted={handlePosted} />}
    </div>
  );
}
