import { getAccessToken, getSessionUser } from "@/lib/session";
import { getThreads } from "@buddyboss-headless/api-client";
import Link from "next/link";
import ThreadsList from "./threads-list";

const PER_PAGE = 20;

export default async function MessagesPage() {
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
          to view your messages.
        </p>
      </main>
    );
  }

  const threads = await getThreads(user.id, accessToken, { perPage: PER_PAGE });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Messages</h1>
      <ThreadsList
        currentUserId={user.id}
        initialItems={threads.items}
        initialTotal={threads.total}
        initialPages={threads.pages}
      />
    </main>
  );
}
