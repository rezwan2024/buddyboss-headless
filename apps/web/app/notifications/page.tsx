import { getAccessToken } from "@/lib/session";
import { getNotifications } from "@buddyboss-headless/api-client";
import Link from "next/link";
import NotificationsList from "./notifications-list";

const PER_PAGE = 20;

export default async function NotificationsPage() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          <Link href="/login" className="underline underline-offset-2">
            Log in
          </Link>{" "}
          to view your notifications.
        </p>
      </main>
    );
  }

  const notifications = await getNotifications(accessToken, { perPage: PER_PAGE });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <NotificationsList
        initialItems={notifications.items}
        initialTotal={notifications.total}
        initialPages={notifications.pages}
      />
    </main>
  );
}
