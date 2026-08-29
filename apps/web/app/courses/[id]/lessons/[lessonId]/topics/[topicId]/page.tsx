import { fetchOrNotFound } from "@/lib/fetch-or-not-found";
import { decodeEntities } from "@/lib/format";
import { getAccessToken } from "@/lib/session";
import { getLessonTopic } from "@buddyboss-headless/api-client";
import Link from "next/link";
import { notFound } from "next/navigation";
import TopicCompleteToggle from "./topic-complete-toggle";

export default async function LessonTopicPage({
  params,
}: PageProps<"/courses/[id]/lessons/[lessonId]/topics/[topicId]">) {
  const { id, lessonId: lessonIdParam, topicId: topicIdParam } = await params;
  const courseId = Number(id);
  const lessonId = Number(lessonIdParam);
  const topicId = Number(topicIdParam);
  if (
    !Number.isInteger(courseId) ||
    courseId <= 0 ||
    !Number.isInteger(lessonId) ||
    lessonId <= 0 ||
    !Number.isInteger(topicId) ||
    topicId <= 0
  ) {
    notFound();
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-xl font-semibold">Topic</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          <Link href="/login" className="underline underline-offset-2">
            Log in
          </Link>{" "}
          to view this topic.
        </p>
      </main>
    );
  }

  // A nonexistent topic id genuinely 404s (confirmed live) — see
  // fetchOrNotFound's doc comment.
  const topic = await fetchOrNotFound(() => getLessonTopic(topicId, accessToken));
  if (!topic.has_course_access) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href={`/courses/${courseId}/lessons/${lessonId}`}
        className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
      >
        ← Lesson
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{decodeEntities(topic.title.rendered)}</h1>
      {topic.content.rendered && (
        <div
          className="prose prose-sm mt-3 max-w-none"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
          dangerouslySetInnerHTML={{ __html: topic.content.rendered }}
        />
      )}
      <div className="mt-4">
        <TopicCompleteToggle
          topicId={topicId}
          lessonId={lessonId}
          courseId={courseId}
          completed={topic.completed}
        />
      </div>
    </main>
  );
}
