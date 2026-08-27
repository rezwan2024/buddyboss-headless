"use client";

export default function GroupsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold text-red-700 dark:text-red-400">
        Couldn't load the groups directory
      </h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded border border-black/20 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
      >
        Try again
      </button>
    </main>
  );
}
