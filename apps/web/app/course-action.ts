"use server";

import { getAccessToken } from "@/lib/session";
import {
  enrollInCourse,
  setLessonComplete,
  setLessonTopicComplete,
} from "@buddyboss-headless/api-client";

export type CourseActionResult = { ok: true } | { ok: false; error: string };

/**
 * The LearnDash API's own errors (a locked prerequisite, sequential-
 * progress rules) are real, human-readable strings — confirmed live, e.g.
 * "You must complete each lesson/topic in sequence." Surface those
 * directly rather than a generic message; fall back to `fallback` for
 * anything else (a network failure, an unexpected shape).
 */
function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export async function enrollInCourseAction(courseId: number): Promise<CourseActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in to enroll." };

  try {
    await enrollInCourse(courseId, accessToken);
  } catch (err) {
    return { ok: false, error: errorMessage(err, "Couldn't enroll — try again.") };
  }
  return { ok: true };
}

export async function setLessonCompleteAction(
  lessonId: number,
  courseId: number,
  complete: boolean,
): Promise<CourseActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in." };

  try {
    await setLessonComplete(lessonId, courseId, complete, accessToken);
  } catch (err) {
    return { ok: false, error: errorMessage(err, "Couldn't update that — try again.") };
  }
  return { ok: true };
}

export async function setLessonTopicCompleteAction(
  topicId: number,
  lessonId: number,
  courseId: number,
  complete: boolean,
): Promise<CourseActionResult> {
  const accessToken = await getAccessToken();
  if (!accessToken) return { ok: false, error: "You must be logged in." };

  try {
    await setLessonTopicComplete(topicId, lessonId, courseId, complete, accessToken);
  } catch (err) {
    return { ok: false, error: errorMessage(err, "Couldn't update that — try again.") };
  }
  return { ok: true };
}
