// Derived from GET /buddyboss/v1/forums, /topics, and /reply. bbPress
// underneath, so these are post-type shaped (title/content.rendered,
// author as a bare numeric ID with no embedded name/avatar), not
// BP-table shaped like activity/members/groups.
import { z } from "zod";
import { looseBoolean, looseNumber } from "./shared";

const renderedTitle = z.object({ rendered: z.string().catch("") }).catch({ rendered: "" });
const renderedContent = z.object({ rendered: z.string().catch("") }).catch({ rendered: "" });

export const forumSchema = z.object({
  id: looseNumber,
  title: renderedTitle,
  content: renderedContent,
  slug: z.string().catch(""),
  total_topic_count: looseNumber,
  total_reply_count: looseNumber,
  last_active_time: z.string().catch(""),
  is_closed: looseBoolean,
});

export type Forum = z.infer<typeof forumSchema>;

export const forumListSchema = z.array(forumSchema);

export const topicSchema = z.object({
  id: looseNumber,
  title: renderedTitle,
  content: renderedContent,
  author: looseNumber,
  date: z.string().catch(""),
  forum_id: looseNumber,
  total_reply_count: looseNumber,
  is_closed: looseBoolean,
  sticky: looseBoolean,
});

export type Topic = z.infer<typeof topicSchema>;

export const topicListSchema = z.array(topicSchema);

export const replySchema = z.object({
  id: looseNumber,
  content: renderedContent,
  author: looseNumber,
  date: z.string().catch(""),
  parent: looseNumber,
  depth: looseNumber,
});

export type Reply = z.infer<typeof replySchema>;

export const replyListSchema = z.array(replySchema);

// POST /buddyboss/v1/topics and /buddyboss/v1/reply — both return the full
// created post, but this project only needs the id (to redirect to the new
// topic, or to refetch the reply list).
export const forumPostCreateResponseSchema = z.object({ id: looseNumber });
export type ForumPostCreateResponse = z.infer<typeof forumPostCreateResponseSchema>;
