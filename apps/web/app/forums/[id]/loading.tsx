export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="h-6 w-48 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-6 h-5 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 space-y-2">
        {["a", "b", "c"].map((key) => (
          <div
            key={key}
            className="h-14 animate-pulse rounded border border-black/10 dark:border-white/10"
          />
        ))}
      </div>
    </main>
  );
}
