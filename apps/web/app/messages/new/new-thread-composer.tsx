"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { type SendNewThreadState, sendNewThreadAction } from "../../message-action";

const initialState: SendNewThreadState = {};

export default function NewThreadComposer({ recipientId }: { recipientId: number }) {
  const boundAction = sendNewThreadAction.bind(null, recipientId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.success || !state.threadId) return;
    router.push(`/messages/${state.threadId}`);
  }, [state, router]);

  return (
    <form action={formAction} className="mt-4">
      <textarea
        name="message"
        rows={4}
        placeholder="Write your message…"
        className="w-full resize-none rounded border border-black/10 bg-transparent p-3 text-sm outline-none placeholder:text-black/40 dark:border-white/10 dark:placeholder:text-white/40"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
