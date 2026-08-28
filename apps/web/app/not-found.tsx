import Link from "next/link";

// Renders inside the root layout (header/footer still show) — this only
// catches an actual unmatched route. Every dynamic page in this app calls
// notFound() itself for a missing/invalid resource (member, group, forum,
// topic, thread...) rather than throwing, since BuddyBoss returns 200 with
// an empty body for those instead of a real 404 — see each page's own
// comment for that pattern. Both paths land here.
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        The page you're looking for doesn't exist, or the thing it pointed to was removed.
      </p>
      <Link href="/" className="mt-4 inline-block text-sm underline underline-offset-2">
        Back to the activity feed
      </Link>
    </main>
  );
}
