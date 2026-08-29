// Derived from GET/POST buddyboss-app/learndash/v1/{courses,lessons,topics} —
// the same REST API BuddyBoss's own official mobile app uses for LearnDash,
// not the raw ldlms/v2 API (which 403s for a plain subscriber) or the
// single-route buddyboss/v1/learndash/courses bridge (no detail/lesson/topic
// routes at all). Confirmed live, not from docs. Trimmed to what the course
// catalog, course detail, and lesson/topic pages render.
//
// Naming: "topic" here is a LearnDash lesson sub-step, unrelated to
// forum.ts's bbPress `Topic` (a forum thread) — named `LessonTopic`
// throughout this app's code to keep the two apart.
import { z } from "zod";
import { looseBoolean, looseNumber } from "./shared";

const renderedTitle = z.object({ rendered: z.string().catch("") }).catch({ rendered: "" });
const renderedContent = z.object({ rendered: z.string().catch("") }).catch({ rendered: "" });

// `small`/`large` are `null` when no image is set — confirmed live (a
// lesson/topic with no featured image), unlike most other image fields in
// this codebase which come back as `""` instead.
const courseMediaSchema = z
  .object({
    small: z.string().nullable().catch(null),
    large: z.string().nullable().catch(null),
  })
  .catch({ small: null, large: null });

export const courseSchema = z.object({
  id: looseNumber,
  title: renderedTitle,
  excerpt: renderedContent,
  slug: z.string().catch(""),
  featured_media: courseMediaSchema,
  cover_media: courseMediaSchema,
  // Per-viewer — true only when logged in AND enrolled (or the course
  // needs no enrollment). Confirmed live: an anonymous or non-enrolled
  // read still gets these keys, just always false/true-to-enroll.
  has_course_access: looseBoolean,
  can_enroll: looseBoolean,
  is_closed: looseBoolean,
  purchasable: looseBoolean,
  progression: looseNumber,
  enrolled_members: looseNumber,
});

export type Course = z.infer<typeof courseSchema>;

export const courseListSchema = z.array(courseSchema);

export const lessonSchema = z.object({
  id: looseNumber,
  title: renderedTitle,
  content: renderedContent,
  course: looseNumber,
  featured_media: courseMediaSchema,
  has_course_access: looseBoolean,
  has_content_access: looseBoolean,
  completed: looseBoolean,
  // Confirmed live: `topics` is a bare array of LessonTopic ids — no
  // embedded title/status, a separate `getLessonTopics` call resolves
  // those (same batched-lookup shape this project already uses for forum
  // topic/reply authors).
  topics: z.array(looseNumber).catch([]),
});

export type Lesson = z.infer<typeof lessonSchema>;

export const lessonListSchema = z.array(lessonSchema);

export const lessonTopicSchema = z.object({
  id: looseNumber,
  title: renderedTitle,
  content: renderedContent,
  course: looseNumber,
  lesson: looseNumber,
  has_course_access: looseBoolean,
  has_content_access: looseBoolean,
  completed: looseBoolean,
});

export type LessonTopic = z.infer<typeof lessonTopicSchema>;

export const lessonTopicListSchema = z.array(lessonTopicSchema);
