export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="h-6 w-56 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-6 w-32 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-6 h-5 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
    </main>
  );
}
