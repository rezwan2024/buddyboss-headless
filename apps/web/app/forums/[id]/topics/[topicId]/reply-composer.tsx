"use client";

import { useSessionUser } from "@/lib/use-session-user";
import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useEffect, useRef } from "react";
import { type PostReplyState, postReplyAction } from "../../../../reply-action";

const initialState: PostReplyState = {};

export default function ReplyComposer({ topicId }: { topicId: number }) {
  const isLoggedIn = Boolean(useSessionUser());
  const boundAction = postReplyAction.bind(null, topicId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    queryClient.invalidateQueries({ queryKey: ["replies", topicId] });
    // Depending on `state` (not `state.success`): useActionState returns a
    // new object each dispatch, but `.success` alone would stay `true`
    // across two replies posted in a row in the same mount, silently
    // skipping this effect the second time — see activity-composer.tsx for
    // where this was first caught.
  }, [state, queryClient, topicId]);

  if (!isLoggedIn) return null;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-4 rounded border border-black/10 p-3 dark:border-white/10"
    >
      <textarea
        name="content"
        rows={3}
        placeholder="Write a reply…"
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
      />
      <div className="mt-2 flex items-center justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Posting…" : "Reply"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
