export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="h-8 w-2/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-4 w-40 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-4 h-64 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
    </main>
  );
}
