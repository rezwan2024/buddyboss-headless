"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useEffect, useRef } from "react";
import { type SendReplyState, sendReplyAction } from "../../message-action";

const initialState: SendReplyState = {};

export default function ReplyComposer({ threadId }: { threadId: number }) {
  const boundAction = sendReplyAction.bind(null, threadId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    queryClient.invalidateQueries({ queryKey: ["thread", threadId] });
    queryClient.invalidateQueries({ queryKey: ["threads"] });
    // Depending on `state` (not `state.success`): see activity-composer.tsx
    // for why — a boolean dependency wouldn't re-fire on a second reply in
    // the same mount.
  }, [state, queryClient, threadId]);

  return (
    <form ref={formRef} action={formAction} className="mt-4">
      <div className="flex gap-2">
        <input
          name="message"
          type="text"
          placeholder="Write a message…"
          className="min-w-0 flex-1 rounded border border-black/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-black/40 dark:border-white/10 dark:placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
