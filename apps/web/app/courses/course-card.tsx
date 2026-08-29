import { decodeEntities } from "@/lib/format";
import type { Course } from "@buddyboss-headless/types";
import Image from "next/image";
import Link from "next/link";

export default function CourseCard({ course }: { course: Course }) {
  const image = course.featured_media.large ?? course.featured_media.small;

  return (
    <li>
      <Link
        href={`/courses/${course.id}`}
        className="block overflow-hidden rounded border border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
      >
        <div className="relative aspect-video w-full bg-black/5 dark:bg-white/5">
          {image && (
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 672px) 100vw, 336px"
              className="object-cover"
            />
          )}
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-medium text-black/80 dark:text-white/80">
            {decodeEntities(course.title.rendered)}
          </p>
          {course.has_course_access ? (
            <p className="mt-1 text-xs text-black/60 dark:text-white/60">
              {course.progression}% complete
            </p>
          ) : (
            <p className="mt-1 text-xs text-black/60 dark:text-white/60">
              {course.enrolled_members} enrolled
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
