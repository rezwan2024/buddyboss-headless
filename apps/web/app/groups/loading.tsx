export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="h-6 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-4 h-9 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <div
            key={key}
            className="flex items-center gap-3 rounded border border-black/10 p-3 dark:border-white/10"
          >
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
