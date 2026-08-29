import { getAccessToken } from "@/lib/session";
import { getCourses } from "@buddyboss-headless/api-client";
import CoursesList from "./courses-list";

const PER_PAGE = 20;

export default async function CoursesPage() {
  const accessToken = await getAccessToken();
  const { items, total, pages } = await getCourses({
    perPage: PER_PAGE,
    accessToken: accessToken ?? undefined,
  });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Courses</h1>
      <p className="mt-1 text-sm text-black/50 dark:text-white/50">
        {total} course{total === 1 ? "" : "s"}
      </p>
      <CoursesList initialItems={items} initialTotal={total} initialPages={pages} />
    </main>
  );
}
