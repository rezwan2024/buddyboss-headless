import { fetchOrNotFound } from "@/lib/fetch-or-not-found";
import { decodeEntities } from "@/lib/format";
import { getAccessToken } from "@/lib/session";
import { getLesson, getLessonTopics } from "@buddyboss-headless/api-client";
import Link from "next/link";
import { notFound } from "next/navigation";
import LessonCompleteToggle from "./lesson-complete-toggle";

export default async function LessonDetailPage({
  params,
}: PageProps<"/courses/[id]/lessons/[lessonId]">) {
  const { id, lessonId: lessonIdParam } = await params;
  const courseId = Number(id);
  const lessonId = Number(lessonIdParam);
  if (
    !Number.isInteger(courseId) ||
    courseId <= 0 ||
    !Number.isInteger(lessonId) ||
    lessonId <= 0
  ) {
    notFound();
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-xl font-semibold">Lesson</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          <Link href="/login" className="underline underline-offset-2">
            Log in
          </Link>{" "}
          to view this lesson.
        </p>
      </main>
    );
  }

  // A nonexistent lesson id genuinely 404s (confirmed live) — see
  // fetchOrNotFound's doc comment.
  const lesson = await fetchOrNotFound(() => getLesson(lessonId, accessToken));
  if (!lesson.has_course_access) notFound();

  const topics = await getLessonTopics(lessonId, { accessToken });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href={`/courses/${courseId}`}
        className="text-sm text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
      >
        ← Course
      </Link>
      <h1 className="mt-2 text-xl font-semibold">{decodeEntities(lesson.title.rendered)}</h1>
      {lesson.content.rendered && (
        <div
          className="prose prose-sm mt-3 max-w-none"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
          dangerouslySetInnerHTML={{ __html: lesson.content.rendered }}
        />
      )}

      {topics.length === 0 ? (
        <div className="mt-4">
          <LessonCompleteToggle
            lessonId={lessonId}
            courseId={courseId}
            completed={lesson.completed}
          />
        </div>
      ) : (
        <>
          <h2 className="mt-6 text-lg font-semibold">Topics</h2>
          <ul className="mt-2">
            {topics.map((topic) => (
              <li key={topic.id} className="border-b border-black/10 py-3 dark:border-white/10">
                <Link
                  href={`/courses/${courseId}/lessons/${lessonId}/topics/${topic.id}`}
                  className="flex items-center justify-between hover:underline"
                >
                  <span className="text-sm">{decodeEntities(topic.title.rendered)}</span>
                  <span className="shrink-0 text-xs text-black/50 dark:text-white/50">
                    {topic.completed ? "✓ Done" : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
