import { getGroups } from "@buddyboss-headless/api-client";
import GroupsList from "./groups-list";

const PER_PAGE = 20;

export default async function GroupsPage() {
  const { items, total, pages } = await getGroups({ perPage: PER_PAGE });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Groups</h1>
      <GroupsList initialItems={items} initialTotal={total} initialPages={pages} />
    </main>
  );
}
