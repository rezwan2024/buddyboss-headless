import { fetchOrNotFound } from "@/lib/fetch-or-not-found";
import { decodeEntities } from "@/lib/format";
import { getAccessToken, getSessionUser } from "@/lib/session";
import { getThread, markThreadRead } from "@buddyboss-headless/api-client";
import Link from "next/link";
import { notFound } from "next/navigation";
import MessagesThread from "./messages-thread";

export default async function ThreadPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const threadId = Number(id);
  if (!Number.isInteger(threadId) || threadId <= 0) notFound();

  const accessToken = await getAccessToken();
  const user = await getSessionUser();

  if (!accessToken || !user) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-xl font-semibold">Messages</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          <Link href="/login" className="underline underline-offset-2">
            Log in
          </Link>{" "}
          to view this conversation.
        </p>
      </main>
    );
  }

  // An unknown thread id 404s; one you're not a participant in 403s
  // (confirmed live) — both should look like "not found" to the viewer,
  // not a raw error, and not distinguishable from each other (don't leak
  // whether a thread id exists to someone who can't access it). See
  // fetchOrNotFound's doc comment.
  const thread = await fetchOrNotFound(() => getThread(threadId, accessToken), [403, 404]);

  // GET doesn't mark a thread read on its own — see markThreadRead's doc
  // comment. Best-effort: a failure here shouldn't block viewing the thread.
  if (thread.unread_count > 0) {
    await markThreadRead(threadId, accessToken).catch(() => {});
  }

  const others = Object.values(thread.recipients).filter((r) => r.user_id !== user.id);
  const title = others.map((r) => decodeEntities(r.name)).join(", ") || "Deleted member";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href="/messages"
        className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
      >
        ← Messages
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{title}</h1>
      <MessagesThread threadId={threadId} currentUserId={user.id} initialThread={thread} />
    </main>
  );
}
