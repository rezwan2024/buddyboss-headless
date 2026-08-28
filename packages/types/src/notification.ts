// Derived from GET/PATCH /buddyboss/v1/notifications — confirmed live
// against a real friend-request notification. `is_new` comes back as an
// integer (0/1) on individual items even though the list filter param is
// typed boolean — loose-typing gotcha, coerce rather than trust.
import { z } from "zod";
import { avatarUrlsSchema, looseBoolean, looseNumber } from "./shared";

export const notificationSchema = z.object({
  id: looseNumber,
  item_id: looseNumber,
  secondary_item_id: looseNumber,
  component: z.string().catch(""),
  action: z.string().catch(""),
  date: z.string().catch(""),
  is_new: looseBoolean,
  // HTML with the WP-hosted `link_url` already baked in as an `<a href>` —
  // never render this raw (would leak a link to the WordPress host, which
  // this project never does). Strip tags before display; see
  // `lib/format.ts`'s `stripTags`.
  description: z.object({ rendered: z.string().catch("") }).catch({ rendered: "" }),
  avatar_urls: avatarUrlsSchema,
});

export type Notification = z.infer<typeof notificationSchema>;

export const notificationListSchema = z.array(notificationSchema);
