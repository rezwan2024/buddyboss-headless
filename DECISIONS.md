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
