import { fetchOrNotFound } from "@/lib/fetch-or-not-found";
import { decodeEntities } from "@/lib/format";
import { getAccessToken } from "@/lib/session";
import { getActivityFeed, getGroup, getGroupMembers } from "@buddyboss-headless/api-client";
import Image from "next/image";
import { notFound } from "next/navigation";
import ActivityComposer from "../../activity-composer";
import ActivityFeedList from "../../activity-feed-list";
import GroupMembers from "./group-members";
import GroupMembershipButton from "./group-membership-button";

const PER_PAGE = 20;

export default async function GroupDetailPage({ params }: PageProps<"/groups/[id]">) {
  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isInteger(groupId) || groupId <= 0) notFound();

  // `is_member`/`can_join`/`request_id` are per-user, so this needs the
  // access token and can't be the anonymous, ISR-cached read other pages
  // use — see getGroup's doc comment.
  const accessToken = await getAccessToken();
  // A nonexistent group id genuinely 404s (confirmed live) — see
  // fetchOrNotFound's doc comment.
  const group = await fetchOrNotFound(() => getGroup(groupId, accessToken ?? undefined));

  const members = await getGroupMembers(groupId, { perPage: PER_PAGE });
  // `component=groups`+`primary_id` is a real, confirmed-live filter on the
  // activity endpoint — see getActivityFeed's doc comment.
  const activity = await getActivityFeed({
    groupId,
    perPage: PER_PAGE,
    accessToken: accessToken ?? undefined,
  });

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
          {accessToken && (
            <div className="mt-3">
              <GroupMembershipButton group={group} />
            </div>
          )}
        </div>
      </div>

      <h2 className="mt-6 text-lg font-semibold">Activity</h2>
      {/* Posting into a group this account isn't a member of is rejected
          server-side (confirmed live), so the composer is gated on
          `is_member` rather than just "logged in". */}
      {accessToken && group.is_member && <ActivityComposer groupId={groupId} />}
      <ActivityFeedList
        initialItems={activity.items}
        initialTotal={activity.total}
        initialPages={activity.pages}
        scope={{ type: "group", id: groupId }}
      />

      <h2 className="mt-8 text-lg font-semibold">Members</h2>
      <GroupMembers
        groupId={groupId}
        initialItems={members.items}
        initialTotal={members.total}
        initialPages={members.pages}
      />
    </main>
  );
}
