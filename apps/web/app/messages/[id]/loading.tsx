export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="h-4 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-2 h-6 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-4 space-y-4">
        {[
          { key: "a", mine: false },
          { key: "b", mine: true },
          { key: "c", mine: false },
        ].map(({ key, mine }) => (
          <div key={key} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
            <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
            <div className="h-8 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </main>
  );
}
