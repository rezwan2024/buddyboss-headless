import { decodeEntities, timeAgo } from "@/lib/format";
import { getAccessToken } from "@/lib/session";
import { getRepliesWithAuthors, getTopicWithAuthor } from "@buddyboss-headless/api-client";
import { notFound } from "next/navigation";
import AuthorAvatar from "../../../../author-avatar";
import RepliesList from "./replies-list";
import ReplyComposer from "./reply-composer";

const PER_PAGE = 20;

export default async function TopicDetailPage({
  params,
}: PageProps<"/forums/[id]/topics/[topicId]">) {
  const { topicId: topicIdParam } = await params;
  const topicId = Number(topicIdParam);
  if (!Number.isInteger(topicId) || topicId <= 0) notFound();

  const topic = await getTopicWithAuthor(topicId);
  // BuddyBoss returns 200 with an empty/error body for an unknown topic
  // rather than a 404 status — check content, not status.
  if (!topic.id) notFound();

  // Uncached when logged in, so a fresh page load right after replying
  // doesn't show stale, pre-reply data — see PageParams.accessToken.
  const accessToken = await getAccessToken();
  const replies = await getRepliesWithAuthors(topicId, {
    perPage: PER_PAGE,
    accessToken: accessToken ?? undefined,
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">{decodeEntities(topic.title.rendered)}</h1>
      <div className="mt-2 flex items-center gap-2">
        <AuthorAvatar src={topic.author_avatar} size={24} />
        <p className="text-sm text-black/50 dark:text-white/50">
          {decodeEntities(topic.author_name)} · {timeAgo(topic.date)}
        </p>
      </div>
      {topic.content.rendered && (
        <div
          className="prose prose-sm mt-3 max-w-none"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
          dangerouslySetInnerHTML={{ __html: topic.content.rendered }}
        />
      )}

      <h2 className="mt-6 text-lg font-semibold">
        {replies.total} Repl{replies.total === 1 ? "y" : "ies"}
      </h2>
      <RepliesList
        topicId={topicId}
        initialItems={replies.items}
        initialTotal={replies.total}
        initialPages={replies.pages}
      />
      <ReplyComposer topicId={topicId} />
    </main>
  );
}
