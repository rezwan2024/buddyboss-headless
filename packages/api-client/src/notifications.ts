import { notificationListSchema } from "@buddyboss-headless/types";
import type { Notification } from "@buddyboss-headless/types";
import { WpApiError, wpFetchJson, wpFetchList } from "./wp-fetch";

export interface NotificationList {
  items: Notification[];
  total: number;
  pages: number;
}

export interface GetNotificationsParams {
  page?: number;
  perPage?: number;
  /** Confirmed live: the API has no "all" mode — `true` (default) is
   * unread-only, `false` is read-only. Two separate calls, not one filter. */
  isNew?: boolean;
}

/**
 * `GET /buddyboss/v1/notifications` — requires auth, always the current
 * user's own notifications. Always `no-store`: inherently per-user, same
 * as messages.
 */
export async function getNotifications(
  accessToken: string,
  params: GetNotificationsParams = {},
): Promise<NotificationList> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    per_page: String(params.perPage ?? 20),
    is_new: String(params.isNew ?? true),
  });
  return wpFetchList(
    `/buddyboss/v1/notifications?${query}`,
    (body) => notificationListSchema.parse(body),
    { accessToken, cache: "no-store" },
  );
}

/**
 * Unread count without fetching full items — same `X-WP-Total` header
 * pagination every list endpoint in this project uses, just with
 * `per_page=1` and the (default) unread-only filter.
 */
export async function getUnreadNotificationCount(accessToken: string): Promise<number> {
  const { total } = await getNotifications(accessToken, { perPage: 1, isNew: true });
  return total;
}

/**
 * `PATCH /buddyboss/v1/notifications/{id}` with `{is_new: 0}` — confirmed
 * live as the way to mark a notification read (there is no bulk
 * mark-all-read endpoint despite one being listed in `docs/routes.txt` —
 * it 404s). Re-marking an already-read notification 500s with
 * `bp_rest_user_cannot_update_notification_status` — treated as a no-op
 * here rather than an error, since the end state (read) is what the caller
 * wanted either way.
 */
export async function markNotificationRead(id: number, accessToken: string): Promise<void> {
  try {
    await wpFetchJson(`/buddyboss/v1/notifications/${id}`, (body) => body, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_new: 0 }),
      accessToken,
      cache: "no-store",
    });
  } catch (err) {
    // 500 here means "already read", not a real failure — see doc comment.
    if (!(err instanceof WpApiError && err.status === 500)) throw err;
  }
}
