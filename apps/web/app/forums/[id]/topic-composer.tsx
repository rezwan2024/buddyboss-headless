"use client";

import { useSessionUser } from "@/lib/use-session-user";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { type PostTopicState, postTopicAction } from "../../topic-action";

const initialState: PostTopicState = {};

export default function TopicComposer({ forumId }: { forumId: number }) {
  const isLoggedIn = Boolean(useSessionUser());
  const boundAction = postTopicAction.bind(null, forumId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.success || !state.topicId) return;
    // A new topic is a new page, not just a list item — navigate to it
    // rather than resetting the form in place, unlike the reply/comment
    // composers.
    router.push(`/forums/${forumId}/topics/${state.topicId}`);
  }, [state, forumId, router]);

  if (!isLoggedIn) return null;

  return (
    <form
      action={formAction}
      className="mt-4 rounded border border-black/10 p-3 dark:border-white/10"
    >
      <input
        name="title"
        type="text"
        placeholder="Subject"
        className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
      />
      <textarea
        name="content"
        rows={3}
        placeholder="Start a discussion…"
        className="mt-2 w-full resize-none bg-transparent text-sm outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
      />
      <div className="mt-2 flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Posting…" : "Post topic"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
