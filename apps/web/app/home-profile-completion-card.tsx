import { computeProfileCompleteness } from "@/lib/profile-completeness";
import { getAccessToken, getSessionUser } from "@/lib/session";
import { getMember, getXProfileFieldDefinitions } from "@buddyboss-headless/api-client";

/** Right sidebar, activity home page only — the logged-in user's own
 * profile completeness. Renders nothing when logged out. */
export default async function HomeProfileCompletionCard() {
  const accessToken = await getAccessToken();
  const user = await getSessionUser();
  if (!accessToken || !user) return null;

  const [member, fieldDefs] = await Promise.all([
    getMember(user.id, accessToken),
    getXProfileFieldDefinitions(),
  ]);
  const completeness = computeProfileCompleteness(member, fieldDefs);

  return (
    <div className="rounded border border-black/10 p-4 dark:border-white/10">
      <h2 className="text-sm font-semibold">Complete your profile</h2>
      <p className="mt-2 text-sm">
        <span className="font-semibold">{completeness.percent}%</span>{" "}
        <span className="text-black/50 dark:text-white/50">Complete</span>
      </p>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-blue-600 dark:bg-blue-400"
          style={{ width: `${completeness.percent}%` }}
        />
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        <li className="flex items-center justify-between">
          <span className={completeness.hasPhoto ? "" : "text-black/60 dark:text-white/60"}>
            {completeness.hasPhoto ? "✓" : "○"} Profile Photo
          </span>
        </li>
        <li className="flex items-center justify-between">
          <span className={completeness.hasCover ? "" : "text-black/60 dark:text-white/60"}>
            {completeness.hasCover ? "✓" : "○"} Cover Photo
          </span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-black/60 dark:text-white/60">Details</span>
          <span className="text-black/50 dark:text-white/50">
            {completeness.filled -
              (completeness.hasPhoto ? 1 : 0) -
              (completeness.hasCover ? 1 : 0)}
            /{completeness.total - 2}
          </span>
        </li>
      </ul>
    </div>
  );
}
