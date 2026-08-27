// Derived from the WordPress core index (`GET /wp-json`) — not a
// buddyboss/v1 route, but the source of the site name for header branding.
import { z } from "zod";

export const siteInfoSchema = z.object({
  name: z.string().catch(""),
  description: z.string().catch(""),
  url: z.string().catch(""),
  site_icon_url: z.string().catch(""),
});

export type SiteInfo = z.infer<typeof siteInfoSchema>;
