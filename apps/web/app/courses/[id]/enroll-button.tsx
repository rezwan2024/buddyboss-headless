"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { enrollInCourseAction } from "../../course-action";

/** Only rendered when logged in and not yet enrolled — see page.tsx. */
export default function EnrollButton({ courseId }: { courseId: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      // Non-optimistic: wait for the result before refreshing, same
      // discipline as the group-membership and friendship buttons — see
      // favorite-action.ts for why this codebase doesn't update local
      // state before an action actually resolves.
      const result = await enrollInCourseAction(courseId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {isPending ? "Enrolling…" : "Enroll"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
