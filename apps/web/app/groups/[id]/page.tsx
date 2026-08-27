import { decodeEntities } from "@/lib/format";
import { getGroup, getGroupMembers } from "@buddyboss-headless/api-client";
import Image from "next/image";
import { notFound } from "next/navigation";
import GroupMembers from "./group-members";

const PER_PAGE = 20;

export default async function GroupDetailPage({ params }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isInteger(groupId) || groupId <= 0) notFound();

  const group = await getGroup(groupId);
  // BuddyBoss returns 200 with an empty/error body for an unknown group
  // rather than a 404 status — check content, not status.
  if (!group.id) notFound();

  const members = await getGroupMembers(groupId, { perPage: PER_PAGE });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="overflow-hidden rounded border border-black/10 dark:border-white/10">
        <div className="relative h-32 w-full bg-black/5 dark:bg-white/5">
          {group.cover_url && (
            <Image
              src={group.cover_url}
              alt=""
              fill
              sizes="(max-width: 672px) 100vw, 672px"
              className="object-cover"
            />
          )}
        </div>
        <div className="p-4">
          <div className="-mt-12 flex items-end gap-3">
            <Image
              src={group.avatar_urls.full}
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-full border-4 border-white object-cover dark:border-neutral-900"
            />
          </div>
          <h1 className="mt-3 text-xl font-semibold">{decodeEntities(group.name)}</h1>
          <p className="text-sm text-black/50 dark:text-white/50">
            {group.status} · {group.members_count} member{group.members_count === 1 ? "" : "s"}
            {group.group_type_label && ` · ${decodeEntities(group.group_type_label)}`}
          </p>
          {group.description.rendered && (
            <div
              className="prose prose-sm mt-3 max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
              dangerouslySetInnerHTML={{ __html: group.description.rendered }}
            />
          )}
        </div>
      </div>

      <h2 className="mt-6 text-lg font-semibold">Members</h2>
      <GroupMembers
        groupId={groupId}
        initialItems={members.items}
        initialTotal={members.total}
        initialPages={members.pages}
      />
    </main>
  );
}
