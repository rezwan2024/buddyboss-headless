import { xprofileGroupDefListSchema } from "@buddyboss-headless/types";
import type { XProfileGroupDef } from "@buddyboss-headless/types";
import { wpFetchJson } from "./wp-fetch";

/**
 * The canonical set of profile fields this install has configured —
 * `GET /buddyboss/v1/xprofile/groups?fetch_fields=1`. Same for every
 * viewer (not per-user), so it's safe to ISR-cache anonymously; field
 * definitions change rarely, hence the long revalidate window.
 */
export async function getXProfileFieldDefinitions(): Promise<XProfileGroupDef[]> {
  return wpFetchJson(
    "/buddyboss/v1/xprofile/groups?fetch_fields=1",
    (body) => xprofileGroupDefListSchema.parse(body),
    { next: { revalidate: 3600, tags: ["xprofile-fields"] } },
  );
}
