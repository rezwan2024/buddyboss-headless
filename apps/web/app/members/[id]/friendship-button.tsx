"use client";

import type { MemberDetail } from "@buddyboss-headless/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  acceptFriendRequestAction,
  declineFriendRequestAction,
  removeFriendAction,
  sendFriendRequestAction,
} from "../../friendship-action";

const buttonClass =
  "rounded border border-black/20 px-3 py-1.5 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10";
const primaryButtonClass =
  "rounded bg-black px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black";

/** Only rendered when logged in and viewing someone else's profile — see page.tsx. */
export default function FriendshipButton({ member }: { member: MemberDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Same non-optimistic discipline as the group membership button: wait
  // for the action to resolve, then router.refresh() — this page has no
  // client-side query cache to fight, so a refresh is enough to get fresh
  // `member.friendship_status`/`friendship_id` props.
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

  let content: React.ReactNode;
  switch (member.friendship_status) {
    case "is_friend":
      content = (
        <button
          type="button"
          onClick={() => run(() => removeFriendAction(member.id))}
          disabled={isPending}
          className={buttonClass}
        >
          {isPending ? "Removing…" : "Remove friend"}
        </button>
      );
      break;
    case "pending":
      content = (
        <button
          type="button"
          onClick={() => run(() => declineFriendRequestAction(member.friendship_id))}
          disabled={isPending}
          className={buttonClass}
        >
          {isPending ? "Cancelling…" : "Cancel request"}
        </button>
      );
      break;
    case "awaiting_response":
      content = (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => run(() => acceptFriendRequestAction(member.friendship_id))}
            disabled={isPending}
            className={primaryButtonClass}
          >
            {isPending ? "Accepting…" : "Accept"}
          </button>
          <button
            type="button"
            onClick={() => run(() => declineFriendRequestAction(member.friendship_id))}
            disabled={isPending}
            className={buttonClass}
          >
            Decline
          </button>
        </div>
      );
      break;
    default:
      if (!member.create_friendship) return null;
      content = (
        <button
          type="button"
          onClick={() => run(() => sendFriendRequestAction(member.id))}
          disabled={isPending}
          className={primaryButtonClass}
        >
          {isPending ? "Sending…" : "Add friend"}
        </button>
      );
  }

  return (
    <div>
      {content}
      {error && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
