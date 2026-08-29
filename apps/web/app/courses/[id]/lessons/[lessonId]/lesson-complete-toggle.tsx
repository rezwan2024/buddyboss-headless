"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setLessonCompleteAction } from "../../../../course-action";

export default function LessonCompleteToggle({
  lessonId,
  courseId,
  completed,
}: {
  lessonId: number;
  courseId: number;
  completed: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await setLessonCompleteAction(lessonId, courseId, !completed);
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
        className={
          completed
            ? "rounded border border-black/20 px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
            : "rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        }
      >
        {isPending ? "Saving…" : completed ? "Mark incomplete" : "Mark complete"}
      </button>
      {error && <p className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
