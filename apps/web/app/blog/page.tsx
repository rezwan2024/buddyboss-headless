import { getPosts } from "@buddyboss-headless/api-client";
import PostsList from "./posts-list";

const PER_PAGE = 20;

export default async function BlogPage() {
  const { items, total, pages } = await getPosts({ perPage: PER_PAGE });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Blog</h1>
      <PostsList initialItems={items} initialTotal={total} initialPages={pages} />
    </main>
  );
}
