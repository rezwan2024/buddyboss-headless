import {
  courseListSchema,
  courseSchema,
  lessonListSchema,
  lessonSchema,
  lessonTopicListSchema,
  lessonTopicSchema,
} from "@buddyboss-headless/types";
import type { Course, Lesson, LessonTopic } from "@buddyboss-headless/types";
import { type WpList, wpFetch, wpFetchJson, wpFetchList } from "./wp-fetch";

// All of this hits buddyboss-app/learndash/v1 — see packages/types/src/learndash.ts
// for why that API and not ldlms/v2 or buddyboss/v1/learndash/courses.

/**
 * BuddyBoss App API responses come back with an `x-app-api-cache` header
 * — confirmed live this is a real server-side response cache, and
 * critically **it is keyed on the request URL only, not the Authorization
 * header**. Three back-to-back requests with the exact same (valid, real)
 * bearer token to the exact same URL returned `has_course_access: false`
 * every time (`x-app-api-cache: hit`), while the true state — confirmed
 * independently via `ld_course_check_user_access()` over `wp eval` — was
 * `true`: whichever user's request happened to populate the cache first
 * is what every *other* user sees afterward, for that exact URL. A
 * throwaway query param forces a cache miss and a correctly-scoped
 * response (confirmed live: `x-app-api-cache: miss`, correct value) —
 * `Cache-Control`/`Pragma: no-cache` request headers do not. This is
 * only appended to authenticated reads — the field values only vary
 * per-user once a token is present at all; the anonymous, ISR-cached
 * path this project already uses when logged out never hits this.
 */
function cacheBust(): string {
  return `_cb=${Date.now()}`;
}

/**
 * `learndash_json_*` errors (a locked prerequisite, sequential-progress
 * rules, "already complete") carry a real, human-readable `message` in
 * the response body — confirmed live (e.g. "You must complete each
 * lesson/topic in sequence."). `wpFetchJson`'s `WpApiError` only ever
 * builds a generic "BuddyBoss API {status} for {path}" string, so the
 * three mutation calls below parse the body themselves to surface the
 * real reason instead of a one-size-fits-all "try again."
 */
async function postAndSurfaceError(path: string, accessToken: string): Promise<void> {
  const res = await wpFetch(path, { method: "POST", accessToken, cache: "no-store" });
  if (res.ok) return;
  const body = await res.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message : undefined;
  throw new Error(message ?? `Request failed (${res.status})`);
}

export interface GetCoursesParams {
  page?: number;
  perPage?: number;
  search?: string;
  accessToken?: string;
}

/**
 * Course catalog — `GET /buddyboss-app/learndash/v1/courses`. Confirmed
 * live: readable anonymously (200 with real data, `has_course_access`
 * just resolves `false`) — same public-read/no-store-when-authenticated
 * split as every other list in this project, since `has_course_access`/
 * `progression` are per-viewer once a token is present. See `cacheBust`
 * for why an authenticated read also needs a throwaway query param, not
 * just `cache: "no-store"` on this project's own side.
 */
export async function getCourses(params: GetCoursesParams = {}): Promise<WpList<Course>> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
  });
  if (params.search) query.set("search", params.search);
  if (params.accessToken) query.set("_cb", String(Date.now()));

  return wpFetchList(
    `/buddyboss-app/learndash/v1/courses?${query}`,
    (body) => courseListSchema.parse(body),
    {
      accessToken: params.accessToken,
      ...(params.accessToken
        ? { cache: "no-store" }
        : { next: { revalidate: 300, tags: ["courses"] } }),
    },
  );
}

/**
 * Single course — `GET /buddyboss-app/learndash/v1/courses/{id}`.
 * Confirmed live: `content.rendered` is a full Elementor/LearnDash HTML
 * dump of the entire lesson list with raw links to the WordPress host —
 * never render it (this project's browser must never see a WP-domain
 * link); the lesson list is fetched separately via `getCourseLessons`
 * instead, which returns clean structured data. See `cacheBust` for the
 * shared-cache workaround this and every other authenticated read below
 * needs.
 */
export async function getCourse(id: number, accessToken?: string): Promise<Course> {
  const bust = accessToken ? `?${cacheBust()}` : "";
  return wpFetchJson(
    `/buddyboss-app/learndash/v1/courses/${id}${bust}`,
    (body) => courseSchema.parse(body),
    {
      accessToken,
      ...(accessToken ? { cache: "no-store" } : { next: { revalidate: 300, tags: ["courses"] } }),
    },
  );
}

/**
 * Enroll the current user in a free/open course — `POST
 * /buddyboss-app/learndash/v1/courses/{id}/enroll`. Confirmed live:
 * flips `has_course_access` to true and `can_enroll` to false on the
 * next read. No body needed. POST responses aren't subject to the
 * `x-app-api-cache` behavior `cacheBust` works around (that's a GET
 * response cache), so no cache-busting param here.
 */
export async function enrollInCourse(id: number, accessToken: string): Promise<void> {
  await postAndSurfaceError(`/buddyboss-app/learndash/v1/courses/${id}/enroll`, accessToken);
}

export interface GetLessonsParams {
  accessToken?: string;
}

/**
 * A course's lessons — `GET /buddyboss-app/learndash/v1/lessons?course_id=`.
 * Confirmed live: `course_id` filters correctly even though it isn't
 * listed in the route's own OPTIONS schema (a BuddyBoss-app-API-wide
 * pattern — same for `lesson_id` on `getLessonTopics`). See `cacheBust`.
 */
export async function getCourseLessons(
  courseId: number,
  params: GetLessonsParams = {},
): Promise<Lesson[]> {
  const bust = params.accessToken ? `&${cacheBust()}` : "";
  return wpFetchJson(
    `/buddyboss-app/learndash/v1/lessons?course_id=${courseId}${bust}`,
    (body) => lessonListSchema.parse(body),
    {
      accessToken: params.accessToken,
      ...(params.accessToken
        ? { cache: "no-store" }
        : { next: { revalidate: 300, tags: ["courses"] } }),
    },
  );
}

/** Single lesson — `GET /buddyboss-app/learndash/v1/lessons/{id}`. See `cacheBust`. */
export async function getLesson(id: number, accessToken?: string): Promise<Lesson> {
  const bust = accessToken ? `?${cacheBust()}` : "";
  return wpFetchJson(
    `/buddyboss-app/learndash/v1/lessons/${id}${bust}`,
    (body) => lessonSchema.parse(body),
    {
      accessToken,
      ...(accessToken ? { cache: "no-store" } : { next: { revalidate: 300, tags: ["courses"] } }),
    },
  );
}

/**
 * Mark a lesson complete/incomplete — `POST .../lessons/{id}/complete` or
 * `/incomplete`, both needing `?course_id=` — confirmed live: without it,
 * the API 400s with "Lesson's course not found! On which you performing
 * action." (its own wording), even though that's not a listed OPTIONS
 * param either.
 */
export async function setLessonComplete(
  id: number,
  courseId: number,
  complete: boolean,
  accessToken: string,
): Promise<void> {
  const action = complete ? "complete" : "incomplete";
  await postAndSurfaceError(
    `/buddyboss-app/learndash/v1/lessons/${id}/${action}?course_id=${courseId}`,
    accessToken,
  );
}

/**
 * A lesson's topics — `GET /buddyboss-app/learndash/v1/topics?lesson_id=`.
 * Confirmed live that `lesson_id` is **not** an honored filter here
 * (unlike `course_id` on `getCourseLessons`, confirmed working with a
 * bogus id returning an empty array) — the endpoint always returns every
 * topic for the whole course regardless of the `lesson_id` passed. Each
 * topic does carry its own real `lesson` id, though, so this filters
 * client-side instead of trusting the query param. See `cacheBust` for
 * the separate response-cache issue this project also works around.
 */
export async function getLessonTopics(
  lessonId: number,
  params: GetLessonsParams = {},
): Promise<LessonTopic[]> {
  const bust = params.accessToken ? `&${cacheBust()}` : "";
  const topics = await wpFetchJson(
    `/buddyboss-app/learndash/v1/topics?lesson_id=${lessonId}${bust}`,
    (body) => lessonTopicListSchema.parse(body),
    {
      accessToken: params.accessToken,
      ...(params.accessToken
        ? { cache: "no-store" }
        : { next: { revalidate: 300, tags: ["courses"] } }),
    },
  );
  return topics.filter((topic) => topic.lesson === lessonId);
}

/** Single topic — `GET /buddyboss-app/learndash/v1/topics/{id}`. See `cacheBust`. */
export async function getLessonTopic(id: number, accessToken?: string): Promise<LessonTopic> {
  const bust = accessToken ? `?${cacheBust()}` : "";
  return wpFetchJson(
    `/buddyboss-app/learndash/v1/topics/${id}${bust}`,
    (body) => lessonTopicSchema.parse(body),
    {
      accessToken,
      ...(accessToken ? { cache: "no-store" } : { next: { revalidate: 300, tags: ["courses"] } }),
    },
  );
}

/**
 * Mark a topic complete/incomplete — needs both `lesson_id` and
 * `course_id` query params (confirmed live the same way as
 * `setLessonComplete`, one level deeper).
 */
export async function setLessonTopicComplete(
  id: number,
  lessonId: number,
  courseId: number,
  complete: boolean,
  accessToken: string,
): Promise<void> {
  const action = complete ? "complete" : "incomplete";
  await postAndSurfaceError(
    `/buddyboss-app/learndash/v1/topics/${id}/${action}?lesson_id=${lessonId}&course_id=${courseId}`,
    accessToken,
  );
}
