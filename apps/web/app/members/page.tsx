import { getMembers } from "@buddyboss-headless/api-client";
import MembersList from "./members-list";

const PER_PAGE = 20;

export default async function MembersPage() {
  const { items, total, pages } = await getMembers({ perPage: PER_PAGE });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Members</h1>
      <MembersList initialItems={items} initialTotal={total} initialPages={pages} />
    </main>
  );
}
