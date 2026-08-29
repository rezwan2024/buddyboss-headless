# DECISIONS.md

Append-only log of choices and why they were made. Newest at the top.

Companion files: `CLAUDE.md` (rules), `PLAN.md` (scope), `PROGRESS.md` (status).
The summary list under "Decisions already made" in `CLAUDE.md` is the short
version of this file — if you add an entry here that changes a standing rule,
update `CLAUDE.md` too.

Purpose: stop settled questions from being reopened, and give future sessions the
reasoning behind things that look arbitrary.

Add an entry whenever a choice is made that a reasonable person might later
question. One entry, a few lines. If a decision is reversed, add a new entry
rather than editing the old one.

Format:

    ## YYYY-MM-DD — Short title
    **Decision:** what was chosen
    **Why:** the reason
    **Alternatives:** what was rejected, briefly

---

## 2026-08-29 — `member-card.tsx` needed the same `suppressHydrationWarning` fix as the Lighthouse pass

**Decision:** `member-card.tsx`'s `Active {timeAgo(...)}` text is now
wrapped in its own `<span suppressHydrationWarning>`, matching the fix
already applied to five other components on 2026-08-28 (see that entry
below).
**Why:** confirmed live via Playwright against production, not assumed:
`/groups/[id]` threw a real `Minified React error #418` (hydration
mismatch) on every load. `member-card.tsx` is used from `GroupMembers`
and the members-directory list — both Client Components — so it goes
through a real hydration pass, but it was never in the 2026-08-28 fix
list (that pass covered `activity-feed-list.tsx`, `activity-comments.tsx`,
and the messages/notifications components — not this one). It had been
silently exposed the whole time; it just hadn't been checked on a route
that's genuinely re-rendered per request before. `/members` (ISR-static)
and `/` (already fixed) never showed it, which is why this specific
instance went unnoticed until a group page's console was actually
checked.
**Alternatives:** none — same fix, same reasoning as the original
2026-08-28 entry; noting it separately here since it was a distinct
component the original pass missed, not a regression from any change
made this session.

## 2026-08-29 — Activity scoping: three different param names for the same "which group" concept

**Decision:** `getActivityFeed` (`packages/api-client/src/activity.ts`)
filters by `user_id` (member profile) or `component=groups`+`primary_id`
(group stream) on GET. Writing into a group uses a *different* name per
endpoint: `createActivity` sends `component`+`primary_item_id`;
`attachMediaOrVideo`/`attachDocument` (`packages/api-client/src/media.ts`)
send a plain `group_id`.
**Why:** confirmed live for each one individually rather than assuming
BuddyBoss is internally consistent about this — it isn't. GET's `item_id`
looks like the obvious param for "which group" but silently doesn't
filter at all (returns every group's activity regardless of value);
`primary_id` is the one that actually works. POST's `primary_item_id`
(not `primary_id`) is what actually creates the activity in that group,
confirmed by posting for real and reading back where it landed.
`/media`, `/video`, and `/document`'s create endpoints don't take
`component`/`primary_item_id` at all — they take `group_id`, confirmed by
reading `class-bp-rest-media-endpoint.php`/`class-bp-rest-document-endpoint.php`
and then testing each live end-to-end (upload → attach with `group_id` →
confirmed the resulting activity's `primary_item_id` matched). Posting
into a group the caller isn't a member of is correctly rejected
server-side with a real 403 (`bp_rest_authorization_required`), confirmed
live against a group the test account doesn't belong to — so gating the
group composer on `group.is_member` is enforcing a real permission, not
just hiding UI that would work anyway.
**Alternatives:** none — this is what the live API actually does; noting
every name explicitly here so a future session doesn't try to make them
consistent (e.g. "fixing" `attachDocument` to use
`component`/`primary_item_id` because that's what `createActivity` uses)
and break group-scoped uploads.

## 2026-08-29 — Member profile composer only posts to your own profile

**Decision:** `members/[id]/page.tsx` only renders `<ActivityComposer />`
when the viewer is looking at their own profile
(`sessionUser.id === member.id`), not on every profile with a session.
**Why:** BuddyBoss's "post on someone else's wall" is an opt-in setting
that wasn't confirmed enabled on this install, and testing it would mean
posting real content onto another real member's profile to find out.
Scoping the composer to "your own feed only" matches what
`createActivity` already did everywhere else in the app before this
change (no scoping at all just meant "post as yourself"), so this is the
conservative default rather than a deliberate feature cut.
**Alternatives:** show the composer on every profile and let a 403 (if
the setting is off) surface as a normal form error — rejected; shipping a
composer that plausibly fails for a reason the user can't see or fix
(a site setting neither logged-in party controls) is worse than not
showing it. Revisit if this install is confirmed to have wall-posting
enabled.

## 2026-08-29 — LearnDash: use `buddyboss-app/learndash/v1`, not `ldlms/v2`

**Decision:** `packages/api-client/src/learndash.ts` calls
`buddyboss-app/learndash/v1` exclusively for courses/lessons/topics/
enroll/complete.
**Why:** this install has five LearnDash-adjacent REST namespaces
registered (`ldlms/v1`, `ldlms/v2`, `learndash/v1`,
`buddyboss/v1/learndash/courses`, `buddyboss-app/learndash/v1`) —
checked all of them live rather than picking the most "official"-looking
one. `ldlms/v2` (LearnDash's own API) `403`s for a plain subscriber, even
authenticated correctly (confirmed the token itself worked against other
endpoints in the same request). `buddyboss/v1/learndash/courses` is a
single route with no detail, lesson, topic, enroll, or complete endpoints
at all — can't build this feature on it. `buddyboss-app/learndash/v1` is
the API BuddyBoss's own official mobile app uses for exactly this
feature set, works for a plain subscriber, and every route this slice
needed was confirmed live.
**Alternatives:** none viable — the other four namespaces are either
permission-gated above what a member needs or too thin to cover
enrollment/lesson/topic/completion.

## 2026-08-29 — LearnDash App API: a response cache not keyed by user

**Decision:** Every authenticated `buddyboss-app/learndash/v1` GET in
`learndash.ts` appends a throwaway `_cb={timestamp}` query parameter
(`cacheBust()`).
**Why:** confirmed live, not assumed: this API's responses carry an
`x-app-api-cache` header, and it really is a server-side cache — three
identical requests with the exact same valid bearer token returned
`has_course_access: false` every time (`x-app-api-cache: hit`) for an
account independently confirmed enrolled via
`ld_course_check_user_access()` over `wp eval`. The cache is keyed on the
request URL alone, not the Authorization header — whichever user's
request happens to populate the cache for a given URL first is what
*every other user* sees for that URL afterward, until it expires. This
is a real, live cross-user data leak in BuddyBoss's own app-API plugin,
not something introduced by or fixable in this project's code. A unique
query param forces a cache miss and the correct per-user value every
time (confirmed: `x-app-api-cache: miss`, correct value); `Cache-Control`/
`Pragma: no-cache` request headers do not bypass it.
**Alternatives:** none from this side of the wire — the cache lives in
WordPress/the BuddyBoss App plugin, not anything this project controls.
Reported here rather than silently worked around so a future session
doesn't mistake the workaround for unnecessary caution and remove it.

## 2026-08-29 — LearnDash App API: `topics?lesson_id=` doesn't actually filter

**Decision:** `getLessonTopics()` fetches the (unfiltered, despite the
query param) topics list and filters client-side on each topic's own
`lesson` field instead of trusting `lesson_id`.
**Why:** confirmed live — `course_id` on the lessons endpoint is a real
filter (a bogus id correctly returns an empty array), but the equivalent
`lesson_id` param on the topics endpoint is silently ignored; every call
returns every topic for the whole course regardless of what's passed.
Caught by an actual UI bug during manual verification (a lesson page
showed 4 topics instead of 2, one of them from a different lesson
entirely, wrongly marked complete) — not from reading docs or guessing.
Every topic response does carry its own real `lesson` id, so filtering
client-side is free and reliable regardless of whether BuddyBoss ever
fixes the server-side param.
**Alternatives:** none — this is what the live API actually does.

## 2026-08-29 — Sign-up uses BuddyBoss's own `/signup` REST API, not a custom endpoint

**Decision:** `packages/api-client/src/signup.ts` calls
`POST /buddyboss/v1/signup` directly. No addition to `wp/plugin-headless`
— the only custom PHP in this project stays the JWT auth plugin, per
`CLAUDE.md`'s existing rule.
**Why:** checked first rather than assuming a custom endpoint was needed
(WP core's own `POST /wp/v2/users` requires `create_users`, admin-only,
which is what made a custom endpoint look necessary at a glance) —
BuddyBoss ships its own public signup REST API, and this install already
has `users_can_register` enabled. Three things about it were confirmed
live, not from docs, because a wrong guess here would have shipped a
broken form:
1. **Success is a bare 302 redirect, not a JSON body.** `signUp()` uses
   `redirect: "manual"` specifically so the underlying `fetch()` never
   follows it — that redirect target is the raw WordPress homepage, and
   this project's browser must never receive or render raw WP HTML.
2. **`field_3` ("Nickname" in BuddyBoss's own UI) is the actual
   `user_login`.** Confirmed by inspecting the created user's row
   directly, not by trusting the field's label — the frontend labels
   this input "Username" since that's what it actually controls.
3. **No email activation step on this install** — a fresh signup can log
   in immediately, confirmed by doing exactly that right after creating
   a test account. `signupAction` chains straight into the existing
   `login()` call rather than sending a new user to a separate login
   screen.
**Alternatives:** a custom `headless-auth` registration endpoint that
wraps `wp_insert_user()` — rejected once the BuddyBoss endpoint was
confirmed to already do everything needed (xprofile fields, uniqueness
checks, immediate usability), which would have made a custom endpoint
pure duplicated logic with none of BuddyBoss's own validation for free.

## 2026-08-28 — Home page sidebars scoped to real features, not a literal reference clone

**Decision:** The activity home page's new left/right sidebars (matching
a reference BuddyBoss community site's dashboard layout) show "Latest
Discussions" + "Groups" (left) and "Complete your profile" + "Latest
updates" (right) — not the reference's Events, Courses (LMS), or curated
Links sections.
**Why:** this app has no Events feature and `PLAN.md` explicitly puts
LMS/course integration out of scope; a curated "Links" section is
site-specific editorial content with no equivalent data source here.
Building placeholder sections for features that don't exist would be
worse than omitting them — a fake "Courses" list linking nowhere real is
not a faithful implementation of anything. Asked the user directly which
real sections to include rather than guessing at a 1:1 visual clone.
**Alternatives:** none seriously considered — this follows directly from
what the app actually has.

## 2026-08-28 — Home page dashboard's e2e slowdown was WP backend
concurrency, not the new sidebars

**Decision:** Shipped the sidebar cards as designed (four independent
Server Components, each its own `<Suspense>` boundary) without further
reducing their data-fetching footprint beyond the one genuinely redundant
call found (see PROGRESS.md's session log).
**Why:** the full e2e suite went from ~20s/0-2-flaky to multi-minute runs
with 10-24 failures right after this landed, which looked at first like
the new sidebars had made the homepage too expensive. Investigated before
concluding that, rather than after: the dev server's own request log
showed 10-30s+ response times and `ECONNRESET` on routes this change
never touched at all (`/groups`, `/members`, `/forums`) — a code defect
in the sidebar work cannot explain a slowdown on pages that don't render
it. A direct, single `curl` against the WP API responded normally
(~2s) both before and after the failing runs; `--workers=1` (no
concurrent load) brought the suite back to 23/25 passing. This is the
shared remote dev site's own concurrency ceiling, already documented
elsewhere in this project (the `fetchWithRetry`/`ECONNRESET` entry, and
the revalidation webhook's own live-verified reliability issues above) —
not something introduced by or fixable in this app's code.
**Alternatives:** could have preemptively gutted the sidebars' data
fetching (e.g., dropped "Complete your profile" or "My Groups" as
"too expensive") based on the failing suite alone — rejected, since that
would have been optimizing against a measurement that turned out not to
mean what it first appeared to. Did make two changes that were correct
regardless of this diagnosis: `<Suspense>`-wrapped each card (real
streaming benefit, independent of *why* the suite was slow) and removed
"Latest updates"' redundant fetch (real duplicate work, worth removing on
its own merits).

## 2026-08-28 — Revalidation webhook: `wp_remote_post` must be blocking, not fire-and-forget

**Decision:** `Revalidate::notify()` (`wp/plugin-headless/includes/class-revalidate.php`)
calls `wp_remote_post()` as a normal **blocking** request (5s timeout), not
`blocking => false`.
**Why:** the first version used `blocking => false` on the theory that a
`save_post` webhook must never add latency to a real editor's save.
Verified live, not assumed: triggering the hook via `wp post update`
(WP-CLI) with `blocking => false` never produced a request Vercel's logs
or the frontend's actual cached content showed any sign of — confirmed by
directly checking the blog listing's rendered content before/after,
`grep`-ing for the changed title. The *same* call with `blocking => true`
landed reliably (HTTP 200, correct body) every time. WP's non-blocking
dispatch tears the socket down as soon as the triggering PHP process
exits, which happens almost immediately after WP-CLI finishes its
command — there's no `fastcgi_finish_request()`-style teardown keeping
the process alive long enough for the async HTTPS handshake to Vercel to
actually complete. A silently-never-arriving "fire and forget" call makes
the entire feature a no-op, which is strictly worse than a bounded delay
on saving one of four tracked post types.
**Alternatives:** kept `blocking => false` and accepted the risk — rejected
once confirmed it doesn't actually work from at least one real trigger
path (WP-CLI), and there was no way to be confident it reliably works from
every other trigger path (wp-admin's own request lifecycle, REST API
edits) without the same live verification, which would have meant testing
each path anyway. A message queue / cron-based async dispatch — real
overengineering for a `save_post` hook on a handful of post types on a
low-traffic site; the accepted tradeoff (≈4.6s measured added latency on
save, verified live, bounded by the 5s timeout) is a better fit for this
project's actual scale.

## 2026-08-28 — Login rate limiting: in-memory, per-IP, not an external store

**Decision:** `lib/rate-limit.ts` keeps failed-login counts in a plain
in-process `Map`, keyed by client IP (from `x-forwarded-for`), 5 failures
→ blocked for 10 minutes. No Upstash/Vercel KV or other external store.
**Why:** asked the user directly rather than assuming — this is a
low-traffic dev/practice site, not a production service under real
attack pressure, and an external store means a new account, a new env
var (added to `.env.local` *and* the Vercel dashboard per this project's
own convention), and a new runtime dependency, none of which are free.
The user chose in-memory to start. It's a real, working deterrent against
naive brute-forcing today, with a known, accepted limitation: Vercel
serverless functions don't share memory across concurrent instances or
survive a redeploy, so under real multi-instance traffic an attacker
could get more than 5 attempts by landing on different warm instances,
and every deploy resets everyone's count to zero.
**Alternatives:** Upstash Redis via the Vercel Marketplace — the correct
answer if this ever needs to hold up against real traffic or a genuine
attacker; deliberately not built now. Revisit if this site gets exposed
more widely or actually sees abuse — swapping the store is contained
entirely inside `rate-limit.ts`'s three functions, nothing in
`auth-actions.ts` would need to change.

## 2026-08-28 — `timeAgo()` in client components needs `suppressHydrationWarning`

**Decision:** Every JSX element that renders `timeAgo(...)`'s output
inside a `"use client"` component (`activity-feed-list.tsx`,
`activity-comments.tsx`, `messages/threads-list.tsx`,
`messages/[id]/messages-thread.tsx`, `notifications/notifications-list.tsx`)
gets `suppressHydrationWarning` on the element wrapping just that text —
not the whole component, not a blanket app-wide setting.
**Why:** `timeAgo()` defaults its `now` param to `Date.now()`, called
fresh on every render. These components render once during SSR (server
wall-clock) and again during hydration (browser wall-clock, measurably
later — worse under throttling), so the two calls can produce different
strings ("9h ago" vs "10h ago") for the exact same underlying timestamp.
React treats this as a real hydration error in production builds
(`Minified React error #418`) — confirmed live on `buddyboss.vercel.app/`
via Lighthouse's console-errors audit and reproduced directly via
Playwright, on every single homepage load. This had never surfaced before
because every session this project has ever tested exclusively used `next
dev` (which prints full, non-minified errors and, per repeated
observation, doesn't appear to trigger this particular mismatch as
visibly) — the bug was real and constant in production the whole time,
just never looked at production's own console before this Lighthouse
pass.
**Alternatives:** thread a single server-captured "now" timestamp down as
a prop so both the SSR pass and the client's first render use the
identical value — more "correct" in the sense of matching exactly, but
adds a prop to every affected component and every list item just to solve
a cosmetic one-render discrepancy. `suppressHydrationWarning` is React's
own documented recommendation for precisely this case (a value expected
to legitimately differ between server and client, like a clock) — see
https://react.dev/reference/react-dom/client/hydrateRoot#handling-different-client-and-server-content.
Scoped to the single text-bearing element in each case, not the whole
component, so it can't silently hide an unrelated future mismatch in the
same component.

## 2026-08-28 — Single-item endpoints genuinely 404; `notFound()` checks were dead code

**Decision:** New `apps/web/lib/fetch-or-not-found.ts` (`fetchOrNotFound`)
wraps every detail page's single-item fetch and calls Next's `notFound()`
when the resulting `WpApiError`'s status is 404 (or, for message threads,
403 too). Applied to `members/[id]`, `groups/[id]`, `forums/[id]`,
`forums/[id]/topics/[topicId]`, `messages/[id]`, and `messages/new`.
**Why:** several of these pages carried a comment claiming "BuddyBoss
returns 200 with an empty/error body for an unknown X rather than a 404
status — check content, not status," and a matching `if (!thing.id)
notFound()` check below the fetch. Checked live via curl, not assumed:
`GET /members/{id}`, `/groups/{id}`, `/forums/{id}`, `/topics/{id}` all
genuinely return HTTP 404 for a nonexistent id; `GET /messages/{id}`
returns 403 for a thread you're not a participant in. `wpFetchJson` throws
a `WpApiError` on any non-2xx status *before* the schema-parsed body
(and its `!thing.id` check) is ever produced — so that `notFound()` call
was unreachable in exactly the case it was written for. The 200-with-
empty-body pattern this assumed is real elsewhere (`wp/v2/posts?slug=`,
which is what `blog/[slug]` correctly relies on — a *list* endpoint
filtered by slug, not a single-item lookup), but was never actually true
for these single-item routes; the assumption looks like it was carried
over from that pattern without being re-checked per endpoint.
**Alternatives:** none — this is what the API actually does; the fix is
purely about catching the error Next's own 404 machinery is designed for,
instead of letting it fall through to a generic `error.tsx` with a "Try
again" button that can never fix a resource that doesn't exist.

## 2026-08-28 — Caching audit: two latent per-user fields left un-gated on purpose

**Decision:** Not changing `getGroups()` (the `/groups` directory) or
`getActivityComments()` to take an `accessToken`, even though their
response schemas (`groupSchema`, `activitySchema`) technically carry
per-user fields (`is_member`/`can_join`/`request_id`; `favorited`) that
would be stale/wrong for a logged-in user if read from those endpoints'
anonymous, ISR-cached responses.
**Why:** confirmed via `grep` that no component reading either endpoint's
list response actually renders those fields today — `is_member`/
`can_join`/`request_id` are only read by `group-membership-button.tsx`,
which only ever gets its `group` prop from `getGroup()` (the detail page,
already correctly authenticated); `favorited` is only read by
`activity-feed-list.tsx`, which gets its data from `getActivityFeed()`
(also already correctly authenticated), never from
`getActivityComments()`. So the fields are present in the type but dead in
every current call path — not a live bug, just latent risk.
**Alternatives:** thread `accessToken` through both anyway, preemptively —
rejected for now; it would mean giving up ISR caching on two
high-traffic, mostly-anonymous-audience pages (the groups directory, every
comment thread) for a correctness guarantee nothing currently needs.
Revisit **the moment** either screen grows a feature that reads one of
these fields (a "Join" button on a group card, a like button on a
comment) — at that point this stops being latent and becomes the same
class of bug the groups single-item endpoint had (see the `getGroup`
entry above), and the fix is the same established `accessToken` →
`no-store` pattern used everywhere else.

## 2026-08-28 — Notifications: no bulk mark-read, and never render `description.rendered` raw

**Decision:** Notifications are marked read one at a time (`PATCH
/notifications/{id}` with `{is_new: 0}`), and rendered as plain text via a
new `stripTags()` helper (`apps/web/lib/format.ts`), never with
`dangerouslySetInnerHTML`.
**Why:** `docs/routes.txt` lists `/buddyboss/v1/notifications/bulk/read`,
but it 404s live — confirmed, not assumed; there is no bulk-mark-all-read
endpoint on this install, so a "mark all read" button isn't implementable
without N individual PATCH calls. Separately, `description.rendered` comes
back as HTML with a `<a href="...">` already pointing at the live
WordPress host (the same `link_url` field, inlined) — rendering it raw the
way message/activity content is rendered elsewhere in this codebase would
put a real WordPress URL in front of the user, which is exactly the "BFF
leak" this project already fixed once (see the 2026-08-27 member-profile
`link`-field entry below). Caught before shipping this time, by noticing
the pattern rather than by a user report.
**Alternatives:** parse and rewrite the anchor's `href` to an internal
route per notification `component` (e.g. `friends` → `/members/{id}`) —
more correct long-term, but out of scope for this slice; plain text is
safe and simple, and can be upgraded later without touching the schema.

## 2026-08-28 — Messages: no server-side thread dedup, and a counter-intuitive "mark read" flag

**Decision:** Before sending a first message to someone (`message-action.ts`'s
`startConversationAction`, wired to the "Message" button on a profile), always
call `GET /buddyboss/v1/messages/search-thread?recipient_id={id}` first and
route into the existing thread if one comes back. Only fall through to the
`/messages/new?to={id}` compose page when it returns `[]` (no thread yet).
Separately, marking a thread read is `POST /messages/action/{id}` with
`{action: "unread", value: false}` — `value: false` marks it *read*.
**Why:** confirmed live (both directions, two real test accounts) that
`POST /buddyboss/v1/messages` with `recipients: [id]` and no `id` field
creates a brand-new thread every time, even when the two users already share
one — BuddyBoss does not dedup on the write side. Without the
`search-thread` check first, repeat "Message" clicks would fragment a
conversation into multiple threads. The `value: false` → read behavior is
also confirmed live and is the opposite of what the field name suggests;
`GET`-ing a thread does not mark it read on its own, so `page.tsx` calls
`markThreadRead` explicitly (best-effort, swallows failure) whenever
`unread_count > 0`.
**Alternatives:** none seriously considered — `search-thread` is the only
endpoint BuddyBoss exposes for this, and the mark-read semantics aren't a
choice, just a fact to document so a future session doesn't "fix" it by
inverting the boolean.

## 2026-08-28 — bbPress topic/reply deletion doesn't cascade to the activity stream

**Decision:** No code change — this is a test-cleanup gotcha, documented so
it isn't rediscovered from scratch. Deleting a forum topic or reply with
`wp post delete --force` does **not** remove the `bp_activity` row BuddyBoss
creates alongside it (type `bbp_topic_create` / `bbp_reply_create`). To
actually remove test forum content from the activity feed, also call
`bp_activity_delete(["id" => $id])` via `./scripts/wp eval` for each
orphaned activity id (find them with `wp bp activity list` filtered by
component/type, or by eyeballing the feed).
**Why:** discovered mid-session — 5 test activity entries from earlier
forum-feature testing were still visible in the feed days after the
underlying topic/reply posts had been deleted. `bp_activity_delete()` is a
separate cleanup step, not automatic.
**Alternatives:** none — this is how BuddyBoss/bbPress actually behaves;
noting it here so future test cleanup checks the activity stream too, not
just `wp post delete`.

## 2026-08-28 — Forums: `revalidateTag(tag, "max")` doesn't guarantee read-your-own-writes

**Decision:** `getTopics`/`getReplies` (`packages/api-client/src/forums.ts`)
gained an optional `accessToken` param, same shape as `getGroup`/`getMember`:
when set, the read is `cache: "no-store"` instead of the normal
`revalidate: 300, tags: ["forums"]`. `loadTopicsPage`/`loadRepliesPage`
(`apps/web/app/actions.ts`) and both forum page Server Components now pass
it through whenever the caller is logged in.
**Why:** posting a reply worked (confirmed on WordPress directly), but the
topic page's own refetch right after — same tab, a couple seconds later —
still showed "No replies yet." `postReplyAction` was already calling
`revalidateTag("forums", "max")`. The bug: `"max"` is *stale-while-
revalidate*, not an immediate purge — Next's own docs describe it as "the
longest stale window," which is exactly wrong for a read-your-own-writes
case. This had been silently fine everywhere else this session
(activity/groups/members) only because those reads already had an
authenticated `no-store` variant for other reasons — the `revalidateTag`
call was doing real work for the anonymous cache, and the authenticated
path never depended on it. Forums topics/replies had no such variant
(nothing about them is per-user), so this was the first case where
`revalidateTag("forums", "max")` was the *only* freshness mechanism for a
logged-in poster reading their own write — and it isn't fast enough for
that.
**Alternatives:** a shorter `revalidateTag` stale profile (e.g. `"seconds"`,
30s) — rejected, still not a real guarantee, just a smaller window to get
unlucky in. `updateTag` (immediate purge, Server-Action-only) — not used;
this project doesn't enable Cache Components
(`cacheComponents` unset in `next.config.ts`), and `updateTag` wasn't
re-verified as working under the "previous model" after the earlier
decision to avoid it for that reason (see the `wp-fetch` retry entry
below). Matching the established `accessToken` → `no-store` pattern used
everywhere else was the option that didn't require re-litigating that.

## 2026-08-28 — Friends: no separate reject endpoint, and don't trust static analysis of BuddyBoss's permission checks

**Decision:** `packages/api-client/src/friends.ts`'s `removeFriendRequest`
is used for both "cancel a request I sent" and "decline one I received" —
both are `DELETE /buddyboss/v1/friends/{friendship_id}`, no separate
reject endpoint or action param. Removing an *accepted* friendship is a
different call entirely: `DELETE /buddyboss/v1/friends?friend_id={id}`
(the collection route, not the singular one) — confirmed live this
returns HTTP 200 even on failure, with the real result in the body's
`unfriend` field (`true` or an error object), so `removeFriend()` checks
that explicitly rather than trusting `res.ok`.
**Why it matters enough to write down:** a research pass over the PHP
source flagged what looked like a real permission gap — `update_item()`
(accept) and `delete_item()` (decline/withdraw) only check
`is_user_logged_in()` at the REST permission-callback level, with no
visible check that the caller is actually the friendship's recipient.
Live testing directly contradicted this for accept: calling `PATCH
/friends/{id}` as the *initiator* (not the recipient) of a real pending
request 404s with `bp_rest_friends_cannot_update_item` — the underlying
`friends_accept_friendship()` call does its own identity check beyond
what the permission callback shows. Decline/withdraw's identity handling
wasn't independently re-verified the same way (would need a second real
account to test declining-as-a-third-party), so treat it as unconfirmed
either way — not as a known-safe or known-broken fact — rather than
repeating the original static-analysis claim. General lesson: a
permission_callback reading "just checks login status" is not proof an
action is under-protected — BuddyBoss's actual mutation functions
routinely carry their own identity checks the REST layer doesn't surface.
**Alternatives:** none — this is just how the API is shaped.

## 2026-08-28 — `getGroup` reads the list endpoint, not the single-item one, when authenticated

**Decision:** `packages/api-client/src/groups.ts`'s `getGroup(id, accessToken)`,
when `accessToken` is set, calls `GET /buddyboss/v1/groups?include={id}`
(the collection endpoint, filtered to one group) instead of
`GET /buddyboss/v1/groups/{id}` (the single-item endpoint). Anonymous reads
still use the single-item endpoint, unchanged.
**Why:** `GET /buddyboss/v1/groups/{id}` has a confirmed live bug — its
`is_member`/`can_join`/`request_id` fields resolve as if the request were
anonymous, even with a valid, working access token. This wasn't a guess or
a caching artifact:
- Ruled out caching: `wp cache flush` on the live site changed nothing.
- Ruled out a broken token: the *same* token correctly toggled
  `favorited` on `PATCH /activity/{id}/favorite` and correctly identified
  the user via `GET /members/me` in the same test session.
- Directly confirmed the split: for the same group and the same real
  membership, `GET /groups/{id}` reported `is_member: false` while `GET
  /groups?include={id}` reported `is_member: true`, in back-to-back
  requests with the same token. The collection endpoint's `get_items()`
  resolves the current user correctly; the single-item endpoint's
  `get_item()` doesn't — a WordPress/BuddyBoss-side bug, not anything in
  this codebase's auth plugin (ruled out via the favorited/`/members/me`
  checks above, and by comparing `has_filter` output against the actual
  live-request behavior, not a `wp eval` simulation — WP-CLI's own
  bootstrap resolves `get_current_user_id()` to 0 *before* a `wp eval`
  script even runs, which produced a misleading result earlier in this
  investigation and is worth remembering: don't trust `wp eval` to
  reproduce REST-request-time auth behavior).
**Consequence:** this is a workaround for someone else's bug, not a fix —
if BuddyBoss ever patches `get_item()` on this endpoint, the workaround
becomes unnecessary but harmless (the two endpoints already return the
same shape). No test coverage added for the specific bug itself, since
it's external and can't be asserted against without hitting the real API;
covered indirectly by the join/leave e2e test actually passing.

## 2026-08-28 — Private groups use a separate request endpoint, not the join endpoint

**Decision:** `apps/web/app/groups/[id]/group-membership-button.tsx` branches
on `group.status` before calling anything: `'private'` goes through
`requestGroupMembership`/`cancelGroupMembershipRequest`
(`POST`/`DELETE /buddyboss/v1/groups/membership-requests[/...]`); anything
else (public) goes through `joinGroup`/`leaveGroup`
(`POST`/`DELETE /buddyboss/v1/groups/{id}/members[/...]`).
**Why:** confirmed live — `POST /groups/{id}/members` on a private group
doesn't create a pending request, it fails outright with a 500
(`bp_rest_group_member_failed_to_join`). Reading
`class-bp-rest-group-membership-endpoint.php`'s
`create_item_permissions_check()` confirms this is deliberate BuddyBoss
behavior (private groups explicitly rejected there), not a bug — the doc
comments don't mention it either way, so this would've been easy to miss
without testing against the live install. `request_id` on the group GET
response (also confirmed live: comes back as boolean `false`, not `0`,
when there's no pending request) is what the button uses to show "Request
to join" vs. "Cancel request".
**Alternatives:** none considered — this is simply how the API works, not
a design choice with a real alternative.

## 2026-08-28 — Like/favorite: no optimistic UI, wait for the toggle result

**Decision:** `LikesRow`'s like button (`apps/web/app/activity-feed-list.tsx`)
calls `toggleFavoriteAction` and only invalidates the feed query — updating
the UI — after it resolves. No local optimistic state.
**Why:** `PATCH /buddyboss/v1/activity/{id}/favorite` is a pure toggle with
no body; the server decides add-vs-remove from whether the activity is
already in the user's favorites (confirmed live: two calls in a row flip
`favorited` each time). That makes optimistic UI riskier than usual here —
if a click's request is ever lost or duplicated (double-click, slow
network + retry), an optimistic client guess can end up permanently
disagreeing with the server's actual toggle state, with no way to detect
it. This project has already been burned by an optimistic-update bug once
(the logout button setting state before its action resolved, breaking
logout entirely — see git history), so the deliberate choice here is to
eat one round-trip of latency rather than risk a repeat, however unlikely
the specific failure mode.
**Alternatives:** optimistic toggle with rollback-on-error — rejected for
the reason above; the desync risk outweighs the latency win for a
low-frequency action like a like button.

## 2026-08-28 — Comments: top-level only, and comment endpoint's empty-response shape

**Decision:** `packages/api-client/src/activity.ts`'s `createActivityComment`
posts a top-level comment (`POST /buddyboss/v1/activity/{id}/comment` with
just `content`) — no `parent_id`, so no threaded replies-to-a-reply yet.
Every activity's comment count is now a clickable button (previously only
`comment_count > 0` ones were), so a logged-in user can open any activity's
(empty) thread and post its first comment.
**Why:** `POST .../comment` needed no `post_title` (confirmed live, unlike
the main activity-create endpoint — see the entry below), so it was
otherwise a clean, direct implementation. Threaded replies were left out to
keep this a verifiable slice; the UI already renders nested `comments`
recursively (from before this session) so it's a pure additive follow-up
later, not a redesign.
**Also found while verifying (real bug, not just a note):** `GET
/buddyboss/v1/activity/{id}/comment` returns a bare `[]` instead of
`{comment_count, comments}` when there are zero comments — confirmed live.
`activityCommentsResponseSchema` was a plain `z.object()` with no top-level
`.catch()`, so that shape threw an uncaught `ZodError` straight through the
Server Action. In Next 16 dev, that uncaught ZodError then hit a *second*
crash — `TypeError: Cannot set property message of [object Object] which
has only a getter` — while Next tried to process it, which is what actually
surfaced as a stuck "Loading comments…" that never resolved. This bug
predates this session (the schema was already written this way), but was
unreachable until now: previously only activities with `comment_count > 0`
rendered a clickable button, and none of those ever have an empty response.
Fixed by normalizing both response shapes in the schema (see
`packages/types/src/activity.ts`); regression test added in
`apps/web/lib/activity-schema.test.ts`.
**Consequence:** `postCommentAction` (`apps/web/app/comment-action.ts`)
calls `revalidateTag("activity", "max")` after posting — without it, the
client's post-success refetch just re-read `getActivityComments`'/
`getActivityFeed`'s existing `next: {tags}` cache and silently showed stale
data (caught live before shipping, not by the test suite).

## 2026-08-28 — wp-fetch retries GET/HEAD once on a network-level failure

**Decision:** `packages/api-client/src/wp-fetch.ts`'s `wpFetch()` retries the
raw `fetch()` call exactly once, only when it throws (a network-level
failure like a connection reset, not an HTTP error status), and only for
`GET`/`HEAD` requests.
**Why:** posting an activity with a photo/video/document reported a
production-only crash — "Minified React error #441" (decoded via
`facebook/react`'s `codes.json`: *"An error occurred in the Server
Components render"*, a generic message with details redacted in
production). Couldn't get it to recur directly (6 live attempts on
`buddyboss.vercel.app`, including a realistic 1920×1080 image, all
succeeded), but this project's own `pnpm verify` run, unprompted, hit
`ECONNRESET` against the remote WP host multiple times in the same session
— a real, pre-existing flakiness in that connection, not something specific
to the new posting code. An image/video/document post makes 3-4 sequential
requests to WP (upload, attach, caption, plus Next's automatic refetch of
the page after the Server Action) versus 1 for a text-only post, so it's
proportionally more exposed to hitting a reset. The crash presented as the
*whole feed* failing (not an inline composer error) because it happened
during `page.tsx`'s own `getActivityFeed` call, not inside the try/catch'd
Server Action.
**Alternatives:** retrying every request, including writes — rejected: if a
POST actually reached WordPress and only the response was lost, retrying it
would double-post. Retry is intentionally scoped to idempotent reads.
**Consequence:** unverified as the definitive fix (root cause access was
limited to circumstantial evidence, not a caught stack trace) — if the
crash recurs after this, the next step is `vercel logs <url> --follow` kept
running *before* reproducing, to catch the actual digest/stack trace live.

## 2026-08-28 — Activity posts: one attachment per post, no attach-to-existing-activity

**Decision:** Posting an image/video/document creates its own new activity
(via `POST /media`, `/video`, or `/document` with no `activity_id`), and if
there's caption text, it's applied afterward with `PATCH
/activity/{id}`. Text-only posts still use `POST /activity` directly. The
composer only accepts one attachment at a time; picking a second type
disables the others (`apps/web/app/activity-composer.tsx`).
**Why:** confirmed against the live API (curl, then browser) that BuddyBoss
has no working way to attach an upload to an activity the caller already
created:
- `POST /buddyboss/v1/activity` accepts `bp_media_ids`/`bp_videos`/
  `bp_documents`, but reading `class-bp-rest-activity-endpoint.php`
  (`remote/wp-content/plugins/buddyboss-platform/`) shows they're only used
  for a permission check in `create_item()` — nothing persists them. Live
  test confirmed: posting with `bp_media_ids: [11]` created the activity but
  came back with `bp_media_ids: null`.
- `POST /buddyboss/v1/media` (and `/video`) *does* accept `activity_id`, and
  passing an existing one does add the file to that activity's
  `bp_media_ids` meta — but `bp_media_add_handler()`'s new-upload code path
  (`bp-media/bp-media-functions.php`) never forwards `activity_id` into the
  actual `bp_media_add()` call, so BuddyBoss's own `bp_activity_media_add`
  hook (`bp-activity/bp-activity-filters.php`) still fires and creates a
  *second*, separate, empty "posted an update" activity to host the file.
  Confirmed live: passing `activity_id: 379` on attach still produced a
  visible, empty duplicate activity (`380`) in the default feed query
  alongside the real one.
- Deleting that duplicate to clean it up is not an option either — it
  cascade-deletes the underlying `BP_Media`/document row (its `activity_id`
  column, not the meta on the real post, is the one BuddyBoss actually
  reads at render time), which broke the photo entirely in testing.
- Passing multiple `upload_ids` in one `/media` call doesn't merge them into
  one activity either — each file gets its own auto-created container, even
  within a single request (confirmed with a 2-file upload → 2 separate
  activities).
- `PATCH /activity/{id}` on the auto-created container works cleanly, so
  that's how captions get attached to a single-file post.
**Alternatives:** pre-creating a text activity and attaching media to it —
rejected, produces a visible empty duplicate post per the above. Supporting
multiple attachments per post — rejected for now; there's no confirmed way
to merge them into one activity via this API, and shipping N separate,
uncaptioned posts per "one post with 3 photos" would be a worse UX than
disallowing it. Revisit if a documented endpoint/param surfaces, or if
BuddyBoss ships a fix.
**Also found while verifying:** this install requires `post_title` on every
`activity_update` post (`bb_is_activity_post_title_enabled()`), capped at 80
chars — a live 400 without it. `createActivity`/`setActivityContent`
(`packages/api-client/src/activity.ts`) reuse `content` for it since there's
no separate title input in the composer.

## 2026-08-27 — JWT plugin secret: auto-generated, never in wp-config.php

**Decision:** `wp/plugin-headless/includes/class-tokens.php` generates a
random 64-char secret on first use and stores it via `add_option(...,
autoload: false)` — never a `wp-config.php` constant, never committed.
**Why:** `CLAUDE.md` forbids pushing to `wp-config.php`, and the GitHub repo
is public — a secret baked into any tracked file would leak immediately.
Auto-generating on first activation means zero manual server-side setup step
that could be forgotten or done wrong.
**Consequence:** the secret lives only in the live site's database. Losing
that DB (or resetting the option) invalidates every existing session —
acceptable for a dev site; would need a real backup story for production.

## 2026-08-27 — Refresh tokens embed the (non-secret) user ID

**Decision:** A refresh token is `"<user_id>:<random 64 chars>"`, not just
random bytes. The random part is hashed and stored in that user's own
`user_meta`; only the hash is stored, never the plaintext token.
**Why:** Refresh/revoke requests need to find the right user's stored token
record to verify against. Embedding the ID avoids a global scan across
every user's meta for a matching hash — an O(1) lookup instead of O(users).
The ID itself isn't sensitive (it's not a secret), so exposing it in the
token is fine; the random part is what actually authenticates.

## 2026-08-27 — Refresh-and-retry lives in `proxy.ts`, not literally in `wp-fetch.ts`

**Decision:** Token refresh happens proactively in `apps/web/proxy.ts`
(Next's post-16 rename of `middleware.ts`), which runs before every page
request and rewrites the access-token cookie if it's near expiry. wp-fetch
itself does not catch a 401 and retry.
**Why:** `PLAN.md` names "refresh-and-retry in wp-fetch", but that's not
achievable literally in the App Router: wp-fetch only ever runs inside a
Server Component's render, and Server Components cannot write cookies
mid-render — there's no way to persist a refreshed token from there. Proxy
runs earlier in the request lifecycle and can set response cookies, so
refreshing *before* the page renders achieves the same outcome ("session
survives an access-token expiry") without needing an impossible retry path.
**Alternatives:** A Route Handler that pages call before rendering —
rejected as an extra round trip for something proxy already does for free
on every request. Doing nothing and letting the access token 401 — rejected,
that's exactly the failure mode PLAN.md's "done when" condition rules out.

## 2026-08-27 — Login state in the header is read client-side, not via `cookies()`

**Decision:** `<AuthStatus>` (in the header, rendered on every page via the
root layout) reads a small non-httpOnly `hl_user` cookie via
`document.cookie` in a Client Component, rather than the header calling
`cookies()` server-side.
**Why:** `cookies()` is a Next.js dynamic API — calling it anywhere in a
route's render tree opts that whole route out of static rendering/ISR,
unconditionally, regardless of whether a session actually exists. Since the
header renders on literally every page, doing this server-side would have
made every list page (`/members`, `/groups`, `/forums`, `/blog`, all
previously ISR-cached) dynamic forever, not just the one page (`/`) that
actually needs to be user-aware.
**Consequence:** a brief flash of "logged out" in the header before
hydration reads the cookie. `hl_user` is non-sensitive (id/display name
only) — the real session tokens (`hl_access`, `hl_refresh`) stay httpOnly
and are never readable by client JS.

## 2026-08-27 — PHPUnit for the auth plugin stubs WordPress rather than bootstrapping it

**Decision:** `wp/plugin-headless/tests/` unit-tests the actual production
classes (`Tokens`, `Auth::determine_current_user`) against hand-written
stubs of the handful of WP functions they call (`get_option`, `get_user_by`,
etc.) — not a real WordPress test bootstrap with `get_current_user_id()`.
**Why:** `PLAN.md` asks for "a PHPUnit test proving a valid token yields the
right `get_current_user_id()`", which needs a full WP core PHPUnit
integration bootstrap (wp-phpunit + a test database) to test for real. This
project has a standing decision against a local WordPress install (see
below) — setting one up just for this one test would reverse that decision
for a single test's sake.
**Alternatives:** Skip PHPUnit entirely — rejected, `AuthTest.php` still
catches real regressions in the actual filter logic (wrong user, expired
token, tampered signature, deleted user), just without WP's own
current-user caching layered on top. That layer was verified by hand
against the live site instead (curl, end to end) once deployed — see
`PROGRESS.md`.

## 2026-08-27 — pnpm workspace monorepo: `apps/web` + `packages/*`

**Decision:** `apps/web` holds the Next.js app; `packages/types` and
`packages/api-client` are separate workspace packages it depends on via
`workspace:*`.
**Why:** `PLAN.md` already named `packages/types` and `packages/api-client` as
Phase 1 deliverables, which implies packages separate from the app. Keeping
the app under `apps/` leaves room for another consumer of the API client later
without restructuring.
**Alternatives:** A single flat Next.js app at the repo root with no package
boundaries — rejected, it doesn't match the two packages the plan calls for.
Turborepo/Nx — rejected as unneeded ceremony for two small internal packages;
plain pnpm workspaces are enough.
**Consequence:** Next.js only auto-loads `.env.local` from its own directory,
not the repo root — it lives at `apps/web/.env.local`, not `./​.env.local`.
Updated `CLAUDE.md` to say so explicitly after hitting this once.

## 2026-08-27 — Parse-function callbacks, not `ZodSchema<T>`, in `wp-fetch.ts`

**Decision:** `wpFetchJson`/`wpFetchList` in `packages/api-client` take a
`(body: unknown) => T` parse callback rather than a zod schema object typed as
`z.ZodType<T>`/`z.ZodSchema<T>`.
**Why:** Any schema using `.catch()` (needed everywhere per the loose-types
gotcha) has an input type that diverges from its output type. Passing such a
schema through a generic `z.ZodType<T>` parameter made TypeScript infer `T` as
a mangled type with most fields as `unknown` — real fields failed
assignability against the clean `Activity` type from `packages/types`, with
no code-level bug behind it. A plain callback (`(body) => schema.parse(body)`)
sidesteps zod's generic variance entirely.
**Alternatives:** Fighting the variance with `z.ZodSchema<T>` (fixes
`Input = any`) — tried first, didn't fix it. Dropping `.catch()` — rejected,
it's the documented defense against BuddyBoss's inconsistent types.

## 2026-08-27 — Activity feed as the first vertical slice

**Decision:** The one endpoint wired end-to-end in Phase 1 is the global
activity feed (`GET /buddyboss/v1/activity`), not blog or members.
**Why:** It's the endpoint already exercised in Phase 0 (posting/reading test
activity), has real content on the dev site, and exercises the gotchas
`CLAUDE.md` calls out — loose booleans, header-based pagination, HTML content
— in one response shape.

## 2026-08-27 — Public GitHub repo

**Decision:** The repo at github.com/rezwan2024/buddyboss-headless is public.
**Why:** It's a practice project worth showing.
**Consequence:** Two paths must never be committed — `.env.deploy` (server host,
user, key path) and `remote/` (contains `wp-config.php` with live DB credentials
and salts, plus licensed BuddyBoss Pro source). Both are gitignored. Check
`git status` before any first-time commit of a new directory.

## 2026-08-27 — Deploy to Vercel from day one

**Decision:** Wire up Vercel in Phase 1, before any features exist. Every push to
`main` deploys. No separate deployment phase.
**Why:** Environment bugs — hardcoded hostnames, image domains, cookie flags — are
cheap to fix when there are ten files and expensive when there are two hundred.
Deploying early also means there's always a URL to show colleagues, which is the
point of the project.
**Alternatives:** Deploy at the end as a final phase — rejected. It front-loads all
the environment problems into the moment you most want things to work.
**Consequence:** Phase 6 became production hardening (caching audit, error
boundaries, rate limiting) rather than deployment setup.

## 2026-08-27 — Playwright MCP as the verification loop

**Decision:** Configure the Playwright MCP in Phase 1, before building features,
so Claude Code can open pages, click through flows, and read console errors itself.
**Why:** Without it the user is the feedback loop — they run the page, find the
bug, report it back. That's the bottleneck agentic development is meant to remove.
It matters more here than in most projects because BuddyBoss returns 200 with
filtered data rather than erroring, so bugs render as plausible-looking pages
instead of stack traces.
**Alternatives:** Relying on unit tests alone — rejected, they don't catch
rendering or data-shape problems against a live API.

## 2026-08-27 — No local WordPress

**Decision:** Develop directly against the remote BuddyBoss dev site. No Local by
Flywheel install.
**Why:** The server provides SSH, WP-CLI 2.11, and MariaDB. The only reasons to
run WordPress locally were WP-CLI access, DB inspection, and fast PHP iteration —
all of which the remote gives us.
**Alternatives:** Local by Flywheel for development, remote for demo only.
Rejected as unnecessary duplication. Revisit if the site gets refreshed often or
if PHP iteration proves too slow.

## 2026-08-27 — Full write access to the WordPress root

**Decision:** `./scripts/push` can target any path under the WordPress root, not
just the custom plugin directory.
**Why:** Explicitly requested. It is the user's own dev site.
**Guardrails:** dry-run by default, `--go` required to apply, no `--delete`,
requires an explicit subpath so it cannot wipe the site.

## 2026-08-27 — Vercel + existing dev site for deployment

**Decision:** Frontend on Vercel's free tier, backend stays on the BuddyBoss dev
site.
**Why:** Both are free and already available. No server to provision.
**Alternatives:** Oracle Cloud Always Free — rejected due to idle reclamation
risk, ARM capacity problems, and signup friction. A paid VPS — rejected because
free was a requirement.

## 2026-08-27 — BFF pattern, browser never calls WordPress

**Decision:** All WordPress calls go through the Next.js server.
**Why:** Eliminates CORS, keeps auth tokens out of client JavaScript, and lets the
WordPress host stay private if it ever moves.
**Consequence:** Never call WordPress from a Client Component. Client-side
mutations go through Server Actions.

## 2026-08-27 — Use BuddyBoss's REST API as shipped

**Decision:** No custom REST endpoints. The only custom PHP is a JWT auth plugin.
**Why:** `buddyboss/v1` already covers all 16 active components — 153 routes.
Writing our own would duplicate maintained code.
**Exception:** auth, because BuddyBoss's API assumes cookie + nonce, which doesn't
work from a separate Next.js server.

## 2026-08-27 — REST, not GraphQL

**Decision:** No WPGraphQL, no Faust.js.
**Why:** WPGraphQL only exposes core WordPress data. BuddyBoss stores activity,
groups, messages, xProfile, and friendships in its own tables, and there is no
official GraphQL layer for them. Going GraphQL-first would mean writing types and
resolvers for all of BuddyBoss before rendering a single screen.
**Alternatives:** GraphQL for the blog and REST for everything else — rejected as
two paradigms, two clients, two auth paths, for little gain.
