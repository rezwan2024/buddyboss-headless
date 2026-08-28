export default function HomeSidebarCardSkeleton() {
  return (
    <div className="rounded border border-black/10 p-4 dark:border-white/10">
      <div className="h-4 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-black/10 dark:bg-white/10" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      </div>
    </div>
  );
}
