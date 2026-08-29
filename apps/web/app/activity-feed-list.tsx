"use client";

import { decodeEntities, parseReactedNames, timeAgo } from "@/lib/format";
import { mediaProxyUrl } from "@/lib/media-proxy-url";
import { useSessionUser } from "@/lib/use-session-user";
import type { Activity } from "@buddyboss-headless/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { loadActivityPage, loadGroupActivityPage, loadMemberActivityPage } from "./actions";
import ActivityComments from "./activity-comments";
import { toggleFavoriteAction } from "./favorite-action";

function ThumbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6 8.5H3.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1H6v-8Zm1.5 8h6.24a2 2 0 0 0 1.96-1.6l1.1-5.5A1.5 1.5 0 0 0 15.34 7.5H11.5V4.75A1.75 1.75 0 0 0 9.75 3a.75.75 0 0 0-.7.48L7.5 8.06v8.44Z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M6.5 4.6a1 1 0 0 1 1.5-.87l8 5.4a1 1 0 0 1 0 1.74l-8 5.4a1 1 0 0 1-1.5-.87V4.6Z" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M5.5 2A1.5 1.5 0 0 0 4 3.5v13A1.5 1.5 0 0 0 5.5 18h9a1.5 1.5 0 0 0 1.5-1.5V7.6a1.5 1.5 0 0 0-.44-1.06l-4.6-4.6A1.5 1.5 0 0 0 9.9 1.5H5.5Zm4.75 1.06 4.19 4.19H11.5A1.25 1.25 0 0 1 10.25 6V3.06Z" />
    </svg>
  );
}

function LikesRow({ activity, isLoggedIn }: { activity: Activity; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const names = parseReactedNames(activity.reacted_names);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      // Wait for the result before touching any state — see
      // favorite-action.ts for why (this codebase already learned that
      // lesson the hard way with the logout button).
      const result = await toggleFavoriteAction(activity.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={isLoggedIn ? handleToggle : undefined}
        disabled={isPending || !isLoggedIn}
        aria-label={activity.favorited ? "Unlike" : "Like"}
        aria-pressed={activity.favorited}
        className="disabled:cursor-default"
      >
        <ThumbIcon
          className={`h-3 w-3 ${activity.favorited ? "text-blue-600 dark:text-blue-400" : ""}`}
        />
      </button>
      {activity.favorite_count === 0 ? (
        <span>0 likes</span>
      ) : (
        <span className="relative inline-block">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="underline-offset-2 hover:underline"
          >
            {activity.favorite_count} likes
          </button>
          {open && (
            <>
              <button
                type="button"
                aria-label="Close"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setOpen(false)}
              />
              <div className="absolute bottom-full left-0 z-20 mb-1 w-max max-w-56 rounded border border-black/10 bg-white p-2 shadow-lg dark:border-white/10 dark:bg-neutral-900">
                {names.length > 0 ? (
                  names.map((name) => (
                    <p key={name} className="text-black/70 dark:text-white/70">
                      {name}
                    </p>
                  ))
                ) : (
                  <p className="text-black/50 dark:text-white/50">
                    Liked by {activity.favorite_count}
                  </p>
                )}
              </div>
            </>
          )}
        </span>
      )}
      {error && <span className="text-red-700 dark:text-red-400">{error}</span>}
    </span>
  );
}

function ActivityItem({ activity, isLoggedIn }: { activity: Activity; isLoggedIn: boolean }) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <li className="border-b border-black/10 py-4 last:border-0 dark:border-white/10">
      <div className="flex gap-3">
        <Image
          src={activity.user_avatar.thumb}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-black/70 dark:text-white/70">
            {decodeEntities(activity.name)}{" "}
            {/* timeAgo() reads Date.now() — the server-rendered and hydration-time
                strings can legitimately differ by a few seconds, which is a pure
                text-content mismatch React expects to be told about explicitly
                (see https://react.dev/reference/react-dom/client/hydrateRoot#handling-different-client-and-server-content) */}
            <span className="text-black/60 dark:text-white/60" suppressHydrationWarning>
              · {timeAgo(activity.date)}
            </span>
          </p>
          {activity.content.rendered && (
            <div
              className="prose prose-sm mt-1 max-w-none"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
              dangerouslySetInnerHTML={{ __html: activity.content.rendered }}
            />
          )}
          {activity.bp_media_ids && (
            <div
              className={`mt-2 grid gap-1 ${activity.bp_media_ids.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
            >
              {activity.bp_media_ids.map((media) => (
                <div
                  key={media.id}
                  className="relative aspect-video overflow-hidden rounded bg-black/5 dark:bg-white/5"
                >
                  <Image
                    src={mediaProxyUrl(
                      media.attachment_data.activity_thumb || media.attachment_data.full,
                    )}
                    alt=""
                    fill
                    sizes="(max-width: 672px) 100vw, 672px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
          {activity.bp_videos && (
            <div className="mt-2 grid grid-cols-1 gap-1">
              {activity.bp_videos.map((video) => (
                <div
                  key={video.id}
                  className="relative aspect-video overflow-hidden rounded bg-black/5 dark:bg-white/5"
                >
                  <Image
                    src={mediaProxyUrl(
                      video.attachment_data.activity_thumb || video.attachment_data.full,
                    )}
                    alt=""
                    fill
                    sizes="(max-width: 672px) 100vw, 672px"
                    className="object-cover"
                  />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white">
                      <PlayIcon className="h-4 w-4" />
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
          {activity.bp_documents && (
            <div className="mt-2 flex flex-col gap-1">
              {activity.bp_documents.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.download_url}
                  className="flex items-center gap-2 rounded border border-black/10 px-2 py-1.5 text-xs hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                >
                  <DocumentIcon className="h-4 w-4 shrink-0 text-black/60 dark:text-white/60" />
                  <span className="truncate">{doc.filename || "Document"}</span>
                  <span className="ml-auto shrink-0 text-black/60 dark:text-white/60">
                    {doc.size}
                  </span>
                </a>
              ))}
            </div>
          )}
          {!activity.bp_media_ids && activity.bb_activity_post_feature_image?.url && (
            <div className="relative mt-2 aspect-video overflow-hidden rounded bg-black/5 dark:bg-white/5">
              <Image
                src={
                  activity.bb_activity_post_feature_image.medium ||
                  activity.bb_activity_post_feature_image.url
                }
                alt=""
                fill
                sizes="(max-width: 672px) 100vw, 672px"
                className="object-cover"
              />
            </div>
          )}
          <div className="mt-1 flex items-center gap-1 text-xs text-black/60 dark:text-white/60">
            <button
              type="button"
              onClick={() => setCommentsOpen((open) => !open)}
              className="underline-offset-2 hover:underline"
            >
              {activity.comment_count} comments
            </button>
            <span>·</span>
            <LikesRow activity={activity} isLoggedIn={isLoggedIn} />
          </div>
          {commentsOpen && <ActivityComments activityId={activity.id} isLoggedIn={isLoggedIn} />}
        </div>
      </div>
    </li>
  );
}

export interface ActivityFeedListProps {
  initialItems: Activity[];
  initialTotal: number;
  initialPages: number;
  /**
   * Scopes the feed and its infinite-scroll pagination to one member's
   * profile or one group's stream. Omit for the global home feed. The
   * query key is always prefixed with `"activity-feed"` regardless of
   * scope, so a broad `invalidateQueries({queryKey: ["activity-feed"]})`
   * (used by the composer, likes, and comments) still refreshes whichever
   * feed is mounted — see favorite-action.ts/activity-composer.tsx.
   */
  scope?: { type: "member"; id: number } | { type: "group"; id: number };
}

export default function ActivityFeedList({
  initialItems,
  initialTotal,
  initialPages,
  scope,
}: ActivityFeedListProps) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: scope ? ["activity-feed", scope.type, scope.id] : ["activity-feed"],
    queryFn: ({ pageParam }) => {
      if (!scope) return loadActivityPage(pageParam);
      return scope.type === "member"
        ? loadMemberActivityPage(scope.id, pageParam)
        : loadGroupActivityPage(scope.id, pageParam);
    },
    initialPageParam: 1,
    getNextPageParam: (_lastPage, allPages) =>
      allPages.length < initialPages ? allPages.length + 1 : undefined,
    initialData: {
      pages: [{ items: initialItems, total: initialTotal, pages: initialPages }],
      pageParams: [1],
    },
  });

  const items = data.pages.flatMap((page) => page.items);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoggedIn = Boolean(useSessionUser());

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, fetchNextPage]);

  if (items.length === 0) {
    return <p className="mt-8 text-black/50 dark:text-white/50">No activity yet.</p>;
  }

  return (
    <>
      <ul className="mt-6">
        {items.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} isLoggedIn={isLoggedIn} />
        ))}
      </ul>
      {hasNextPage && (
        <div ref={sentinelRef} className="flex justify-center py-6">
          {isFetchingNextPage && (
            <span className="text-sm text-black/50 dark:text-white/50">Loading…</span>
          )}
        </div>
      )}
    </>
  );
}
