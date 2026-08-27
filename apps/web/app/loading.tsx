export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="h-6 w-32 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <ul className="mt-6 space-y-4">
        {["a", "b", "c", "d", "e"].map((key) => (
          <li key={key} className="flex gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
