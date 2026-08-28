import { decodeEntities } from "@/lib/format";
import { getAccessToken } from "@/lib/session";
import { getMember } from "@buddyboss-headless/api-client";
import Link from "next/link";
import { notFound } from "next/navigation";
import AuthorAvatar from "../../author-avatar";
import NewThreadComposer from "./new-thread-composer";

export default async function NewThreadPage({ searchParams }: PageProps<"/messages/new">) {
  const { to } = await searchParams;
  const recipientId = Number(to);
  if (!Number.isInteger(recipientId) || recipientId <= 0) notFound();

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-xl font-semibold">Messages</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          <Link href="/login" className="underline underline-offset-2">
            Log in
          </Link>{" "}
          to send messages.
        </p>
      </main>
    );
  }

  const recipient = await getMember(recipientId);
  if (!recipient.id) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href="/messages"
        className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
      >
        ← Messages
      </Link>
      <div className="mt-2 flex items-center gap-2">
        <AuthorAvatar src={recipient.avatar_urls.thumb} size={32} />
        <h1 className="text-xl font-semibold">{decodeEntities(recipient.name)}</h1>
      </div>
      <NewThreadComposer recipientId={recipientId} />
    </main>
  );
}
