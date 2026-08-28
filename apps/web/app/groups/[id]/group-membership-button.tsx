"use client";

import type { Group } from "@buddyboss-headless/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelGroupMembershipRequestAction,
  joinGroupAction,
  leaveGroupAction,
  requestGroupMembershipAction,
} from "../../group-membership-action";

const buttonClass =
  "rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10";
const primaryButtonClass =
  "rounded bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black";

/** Only rendered when a session exists — see page.tsx. */
export default function GroupMembershipButton({ group }: { group: Group }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Waits for each action's result before refreshing — same discipline as
  // favorite-action.ts/comment-action.ts (this codebase already paid for
  // an optimistic-update bug once; see DECISIONS.md). router.refresh() is
  // the right tool here specifically because this page has no client-side
  // query cache to fight — it's plain server-rendered props, so a refresh
  // gets this component fresh `group.is_member`/`request_id` directly.
  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (group.is_member) {
    return (
      <div>
        <button
          type="button"
          onClick={() => run(() => leaveGroupAction(group.id))}
          disabled={isPending}
          className={buttonClass}
        >
          {isPending ? "Leaving…" : "Leave group"}
        </button>
        {error && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (group.status === "private") {
    if (group.request_id) {
      return (
        <div>
          <button
            type="button"
            onClick={() => run(() => cancelGroupMembershipRequestAction(group.request_id))}
            disabled={isPending}
            className={buttonClass}
          >
            {isPending ? "Cancelling…" : "Cancel request"}
          </button>
          {error && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
        </div>
      );
    }
    if (!group.can_join) return null;
    return (
      <div>
        <button
          type="button"
          onClick={() => run(() => requestGroupMembershipAction(group.id))}
          disabled={isPending}
          className={primaryButtonClass}
        >
          {isPending ? "Requesting…" : "Request to join"}
        </button>
        {error && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (!group.can_join) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => run(() => joinGroupAction(group.id))}
        disabled={isPending}
        className={primaryButtonClass}
      >
        {isPending ? "Joining…" : "Join group"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
