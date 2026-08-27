import { siteInfoSchema } from "@buddyboss-headless/types";
import { wpFetchJson } from "./wp-fetch";

/** WordPress core index (`GET /wp-json`) — site name for header branding. */
export async function getSiteInfo() {
  return wpFetchJson("", (body) => siteInfoSchema.parse(body), {
    next: { revalidate: 3600, tags: ["site-info"] },
  });
}
