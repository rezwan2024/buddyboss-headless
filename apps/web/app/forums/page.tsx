import { getForums } from "@buddyboss-headless/api-client";
import ForumsList from "./forums-list";

const PER_PAGE = 20;

export default async function ForumsPage() {
  const { items, total, pages } = await getForums({ perPage: PER_PAGE });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Forums</h1>
      <ForumsList initialItems={items} initialTotal={total} initialPages={pages} />
    </main>
  );
}
