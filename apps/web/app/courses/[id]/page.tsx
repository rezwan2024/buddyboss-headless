import { fetchOrNotFound } from "@/lib/fetch-or-not-found";
import { decodeEntities } from "@/lib/format";
import { getAccessToken } from "@/lib/session";
import { getCourse, getCourseLessons } from "@buddyboss-headless/api-client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EnrollButton from "./enroll-button";

export default async function CourseDetailPage({ params }: PageProps<"/courses/[id]">) {
  const { id } = await params;
  const courseId = Number(id);
  if (!Number.isInteger(courseId) || courseId <= 0) notFound();

  // `has_course_access`/`progression`/`can_enroll` are per-viewer, so this
  // needs the access token and can't be the anonymous, ISR-cached read
  // the catalog list uses when logged out — same pattern as getGroup.
  const accessToken = await getAccessToken();
  // A nonexistent course id genuinely 404s (confirmed live) — see
  // fetchOrNotFound's doc comment.
  const course = await fetchOrNotFound(() => getCourse(courseId, accessToken ?? undefined));

  const lessons = await getCourseLessons(courseId, { accessToken: accessToken ?? undefined });
  const image =
    course.cover_media.large ?? course.featured_media.large ?? course.featured_media.small;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="overflow-hidden rounded border border-black/10 dark:border-white/10">
        <div className="relative aspect-video w-full bg-black/5 dark:bg-white/5">
          {image && <Image src={image} alt="" fill sizes="672px" className="object-cover" />}
        </div>
        <div className="p-4">
          <h1 className="text-xl font-semibold">{decodeEntities(course.title.rendered)}</h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            {course.enrolled_members} enrolled · {lessons.length} lesson
            {lessons.length === 1 ? "" : "s"}
          </p>
          {course.excerpt.rendered && (
            <div
              className="prose prose-sm mt-3 max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
              dangerouslySetInnerHTML={{ __html: course.excerpt.rendered }}
            />
          )}
          <div className="mt-4">
            {!accessToken ? (
              <p className="text-sm text-black/60 dark:text-white/60">
                <Link href="/login" className="underline underline-offset-2">
                  Log in
                </Link>{" "}
                to enroll in this course.
              </p>
            ) : course.has_course_access ? (
              <div>
                <p className="text-sm font-medium">{course.progression}% complete</p>
                <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-blue-600 dark:bg-blue-400"
                    style={{ width: `${course.progression}%` }}
                  />
                </div>
              </div>
            ) : course.can_enroll ? (
              <EnrollButton courseId={course.id} />
            ) : (
              <p className="text-sm text-black/60 dark:text-white/60">
                Enrollment isn't open for this course.
              </p>
            )}
          </div>
        </div>
      </div>

      <h2 className="mt-6 text-lg font-semibold">Lessons</h2>
      {lessons.length === 0 ? (
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">No lessons yet.</p>
      ) : (
        <ul className="mt-2">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="border-b border-black/10 py-3 dark:border-white/10">
              {lesson.has_course_access ? (
                <Link
                  href={`/courses/${courseId}/lessons/${lesson.id}`}
                  className="flex items-center justify-between hover:underline"
                >
                  <span className="text-sm">{decodeEntities(lesson.title.rendered)}</span>
                  <span className="shrink-0 text-xs text-black/50 dark:text-white/50">
                    {lesson.completed ? "✓ Done" : `${lesson.topics.length} topics`}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center justify-between text-black/40 dark:text-white/40">
                  <span className="text-sm">{decodeEntities(lesson.title.rendered)}</span>
                  <span className="shrink-0 text-xs">🔒 Locked</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
