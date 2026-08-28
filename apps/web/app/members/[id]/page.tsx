import { decodeEntities, timeAgo } from "@/lib/format";
import { getAccessToken, getSessionUser } from "@/lib/session";
import { getMember } from "@buddyboss-headless/api-client";
import Image from "next/image";
import { notFound } from "next/navigation";
import FriendshipButton from "./friendship-button";

export default async function MemberProfilePage({ params }: PageProps<"/members/[id]">) {
  const { id } = await params;
  const memberId = Number(id);
  if (!Number.isInteger(memberId) || memberId <= 0) notFound();

  // `friendship_status`/`friendship_id`/`create_friendship` are per-user —
  // see getMember's doc comment.
  const accessToken = await getAccessToken();
  const sessionUser = await getSessionUser();
  const member = await getMember(memberId, accessToken ?? undefined);
  // The API returns an empty id (coerced to 0 by the schema) for an
  // unknown/invalid member instead of a 404 status — check content, not status.
  if (!member.id) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <div className="overflow-hidden rounded border border-black/10 dark:border-white/10">
        <div className="relative h-32 w-full bg-black/5 dark:bg-white/5">
          {member.cover_url && (
            <Image
              src={member.cover_url}
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
              src={member.avatar_urls.full}
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-full border-4 border-white object-cover dark:border-neutral-900"
            />
          </div>
          <h1 className="mt-3 text-xl font-semibold">{decodeEntities(member.name)}</h1>
          <p className="text-sm text-black/50 dark:text-white/50">@{member.mention_name}</p>
          <dl className="mt-4 space-y-1 text-sm text-black/60 dark:text-white/60">
            {member.registered_date && (
              <div>
                <dt className="inline font-medium">Member since:</dt>{" "}
                <dd className="inline">{new Date(member.registered_date).toLocaleDateString()}</dd>
              </div>
            )}
            {member.last_activity && (
              <div>
                <dt className="inline font-medium">Last active:</dt>{" "}
                <dd className="inline">{timeAgo(member.last_activity)}</dd>
              </div>
            )}
          </dl>
          {accessToken && sessionUser && sessionUser.id !== member.id && (
            <div className="mt-3">
              <FriendshipButton member={member} />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
