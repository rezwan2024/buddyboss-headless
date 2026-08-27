export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="overflow-hidden rounded border border-black/10 dark:border-white/10">
        <div className="h-32 w-full animate-pulse bg-black/10 dark:bg-white/10" />
        <div className="p-4">
          <div className="-mt-12 h-20 w-20 animate-pulse rounded-full border-4 border-white bg-black/10 dark:border-neutral-900 dark:bg-white/10" />
          <div className="mt-3 h-5 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
        </div>
      </div>
    </main>
  );
}
