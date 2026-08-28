"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startConversationAction } from "../../message-action";

/** Only rendered when logged in and viewing someone else's profile — see page.tsx. */
export default function MessageButton({ memberId }: { memberId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await startConversationAction(memberId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(
        result.threadId ? `/messages/${result.threadId}` : `/messages/new?to=${memberId}`,
      );
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
      >
        {isPending ? "Opening…" : "Message"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
