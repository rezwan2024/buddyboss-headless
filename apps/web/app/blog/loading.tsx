export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="h-6 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-4 h-9 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {["a", "b", "c", "d"].map((key) => (
          <div
            key={key}
            className="h-56 animate-pulse rounded border border-black/10 dark:border-white/10"
          />
        ))}
      </div>
    </main>
  );
}
