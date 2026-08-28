export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="h-4 w-20 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-2 flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-black/10 dark:bg-white/10" />
        <div className="h-6 w-32 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </div>
      <div className="mt-4 h-24 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
    </main>
  );
}
