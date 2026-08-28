import { decodeEntities } from "@/lib/format";
import { getAccessToken } from "@/lib/session";
import { getForum, getTopicsWithAuthors } from "@buddyboss-headless/api-client";
import { notFound } from "next/navigation";
import TopicComposer from "./topic-composer";
import TopicsList from "./topics-list";

const PER_PAGE = 20;

export default async function ForumDetailPage({ params }: PageProps<"/forums/[id]">) {
  const { id } = await params;
  const forumId = Number(id);
  if (!Number.isInteger(forumId) || forumId <= 0) notFound();

  const forum = await getForum(forumId);
  // BuddyBoss returns 200 with an empty/error body for an unknown forum
  // rather than a 404 status — check content, not status.
  if (!forum.id) notFound();

  // Uncached when logged in, so a fresh page load right after posting a
  // topic doesn't show stale, pre-post data — see PageParams.accessToken.
  const accessToken = await getAccessToken();
  const topics = await getTopicsWithAuthors(forumId, {
    perPage: PER_PAGE,
    accessToken: accessToken ?? undefined,
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">{decodeEntities(forum.title.rendered)}</h1>
      {forum.content.rendered && (
        <div
          className="prose prose-sm mt-2 max-w-none"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
          dangerouslySetInnerHTML={{ __html: forum.content.rendered }}
        />
      )}

      <h2 className="mt-6 text-lg font-semibold">Topics</h2>
      <TopicComposer forumId={forumId} />
      <TopicsList
        forumId={forumId}
        initialItems={topics.items}
        initialTotal={topics.total}
        initialPages={topics.pages}
      />
    </main>
  );
}
