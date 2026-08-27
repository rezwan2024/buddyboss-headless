# PROGRESS.md

Living state of the project. Claude Code reads this at the start of every session
and updates it at the end. Newest entries at the top.

Keep it short. This is a status file, not a diary. Scope lives in `PLAN.md`,
reasoning in `DECISIONS.md`, rules in `CLAUDE.md`.

---

## Current state

**Phase:** 4 — Authenticated actions — in progress. Done so far: posting to
the activity feed (text-only, or with a single photo/video/document
attachment). Still open: comment, favorite/like, join/leave groups, forum
topics/replies, friends.
**Next task:** pick the next Phase 4 slice — favorite/like and commenting
are the most-requested from earlier phases and share the activity feed UI
already in place, so probably start there.

## Blockers

One open, unconfirmed: the user reported a production-only crash ("Minified
React error #441" — a generic Server Components render error) when posting
an activity with an image. Not reproduced directly despite 6 live attempts;
shipped a scoped fix (retry idempotent WP GETs once on a network-level
failure, see DECISIONS.md) based on circumstantial evidence — this
project's own `pnpm verify` independently hit `ECONNRESET` against the
remote WP host in the same session. **If the user hits it again**, start
`vercel logs buddyboss.vercel.app --follow` *before* they reproduce it, so
the actual digest/stack trace is caught live instead of scrolling past.

The Playwright MCP (`.mcp.json`) is confirmed working in-session — used it
directly to log in, post, and screenshot the result against both localhost
and the live production URL.

## How to see the frontend

    pnpm dev        # then open http://localhost:3000

Keep it running in its own terminal — don't start a second one if it's already
running. Claude Code can also open the page itself once the Playwright MCP
reconnects (see Blockers).

**Live URL:** https://buddyboss.vercel.app — confirmed rendering real activity
feed data. Vercel project `buddyboss` (renamed from `web`) under the `bb-0056`
team, GitHub-connected to `rezwan2024/buddyboss-headless`, root directory
`apps/web`, auto-deploys on push to `main`. SSO deployment protection was on
by default (redirected to a Vercel login page) — disabled so the URL is
publicly viewable, per user confirmation.

**Important gotcha:** `buddyboss.vercel.app` is a manually-set deployment
alias (`vercel alias set <deployment-url> buddyboss.vercel.app`), **not** a
tracked project domain — it does NOT auto-follow new production deploys. Only
the auto-generated `buddyboss-bb-0056.vercel.app` and
`buddyboss-git-main-bb-0056.vercel.app` update automatically. After a
meaningful push, re-run `vercel alias set <latest-prod-deployment-url>
buddyboss.vercel.app` (get the latest URL from `vercel ls buddyboss`) or the
short URL will silently serve a stale build. This bit us once already this
session — got the alias wrong in an earlier version of this note too.

## Open questions

- Does the remote site get periodically refreshed from production? If so, the JWT
  plugin needs redeploying after each refresh.
- Are media URLs CDN-offloaded? Check what the API actually returns before
  configuring `next.config.js`.

## Env vars

Every entry here must exist in **both** `apps/web/.env.local` and the Vercel
dashboard (all three environments: Production, Preview, Development). Add to
this list whenever a new one is introduced.

| Var | Purpose |
|---|---|
| `WP_URL` | BuddyBoss REST base URL — `https://st2-rezwan.hz2.developbb.dev`. Set in `apps/web/.env.local` and in Vercel (Production/Preview/Development) via `vercel env add`. |
| `TEST_USER_LOGIN` / `TEST_USER_PASSWORD` | Dedicated WP test account (`headless-test`, user ID 25, subscriber role) for `tests/e2e/auth.spec.ts`. Local-only, `apps/web/.env.local` only — **not** in Vercel, these tests don't run there. Auth tests skip themselves if unset. |

---

## Session log

### 2026-08-28 — Investigate production crash on image posts, ship a scoped retry

- User hit "Minified React error #441" on `buddyboss.vercel.app` after
  posting with an image — the whole feed broke, not just the composer.
  Decoded the error against `facebook/react`'s `codes.json` (react.dev's
  own error-decoder page 404s without exact args): #441 is a generic
  "error occurred in the Server Components render" with details redacted
  in production.
- Tried to reproduce live against production 6 times (small test image,
  then a realistic 1920×1080 one, both single and rapid-fire) — all
  succeeded. Tried tailing `vercel logs` for the real stack trace but
  didn't have it running *before* a real occurrence, so never caught one.
- Went on circumstantial evidence instead: this session's own `pnpm verify`
  run independently hit `ECONNRESET` against the remote WP host multiple
  times, unprompted — a real, pre-existing flakiness in that connection.
  An image/video/document post makes 3-4 sequential WP requests (upload,
  attach, caption, plus Next's automatic post-action refetch) vs. 1 for
  text-only, so it's proportionally more exposed.
- Shipped `packages/api-client/src/wp-fetch.ts`: retry once on a
  network-level `fetch()` failure, scoped to `GET`/`HEAD` only (retrying a
  POST could double-post if it reached WordPress but the response was
  lost). `pnpm verify` and `pnpm build` still pass; deployed and re-aliased
  `buddyboss.vercel.app`.
- **Not confirmed as the actual fix** — see Blockers above for what to do
  if it recurs.

### 2026-08-28 — Phase 4: post to the activity feed, with an optional photo/video/document

- New composer (`activity-composer.tsx` + `post-activity-action.ts`) above
  the feed on `/`, shown only when logged in. Text-only posts, or one
  attachment (photo, video, or document — not combined; see DECISIONS.md
  for why).
- `packages/api-client/src/media.ts` (new): raw upload + attach-to-activity
  calls for all three attachment types, against the real endpoints
  (`/media/upload`, `/video/upload`, `/document/upload`, then `/media`,
  `/video`, `/document`). `activity.ts` gained `createActivity` (text-only)
  and `setActivityContent` (PATCH, sets a caption on an attachment's
  auto-created activity).
- The request/response shapes for all of this were **not** taken from the
  plugin's own `@apiParam` doc comments — those turned out to be wrong or
  incomplete in a few places (document upload returns `id` not `upload_id`;
  `post_title` is required on this install; `bp_media_ids` on the create
  endpoint is accepted but never persisted). Verified instead by curling the
  live API directly with the `headless-test` account, reading the actual
  plugin source for the parts curl couldn't explain, and cleaning up every
  test post afterward. See DECISIONS.md for the full trail — it's the
  reason the two-step "attach always creates its own activity" design
  exists at all.
- `activityAvatarSchema`/`activitySchema` gained `bp_videos`/`bp_documents`
  parsing and `<ActivityItem>` gained rendering for both (thumbnail +
  play-icon overlay for video, filename/size link for documents) — needed
  to actually see a posted video/document render, and it turned out an
  existing untouched post in the feed already had a document attachment
  that hadn't been rendering until this.
- Real bug caught by Playwright, not by the test suite: the composer's
  `useEffect` that invalidates the feed query after a successful post was
  keyed on `state.success` (a boolean) instead of `state` (the object
  useActionState returns fresh each dispatch) — two successful posts in a
  row in the same mount only refreshed the feed for the first one, silently
  needing a full reload to see the second. Fixed by depending on `state`
  itself; reproduced the original bug and confirmed the fix live, both via
  the browser.
- `pnpm verify` and `pnpm build` both pass. Manually verified in the browser
  (Playwright MCP, logged in as `headless-test`): text-only, photo, video,
  and document posts all created correctly, captioned correctly, and
  rendered correctly — then deleted from the live site afterward.
- **What to look at:** the composer at `/` (must be logged in) — try a
  text-only post, then a post with a photo, video, or document. Two posts
  in a row without reloading should both show up immediately.

### 2026-08-28 — Activity feed: render attached photos and feature images

- User reported post images not showing in the activity feed. Real bug:
  `activitySchema` never parsed `bp_media_ids` (BuddyBoss Media photo
  attachments) or `bb_activity_post_feature_image` at all — the fields
  were silently dropped by zod (unknown keys stripped by default), so the
  data never reached the component in the first place.
- Added both fields to the schema, with the loose-typing quirks specific to
  each: `bp_media_ids` is `null` (no attachment) or an array — normalized
  so an empty array and `null` are treated the same. `bb_activity_post_feature_image`
  is `[]` (unset) or an object (set) — a `z.union` + transform normalizes
  both to `object | null`.
- `<ActivityItem>` renders `bp_media_ids` as a grid (1 photo = full width,
  2+ = two columns) using each attachment's `activity_thumb` size, or the
  feature image (when there's no attached photo) as a single full-width
  image — both via `next/image` `fill`, same pattern used elsewhere.
- Verified against live data, not just the schema: an E2E test confirms an
  actual `<img>` renders inside a post, and the dev server's own LCP log
  line during the test run named the exact attached-photo URL as the
  page's Largest Contentful Paint — real proof it painted, not just parsed.
- Comment threads reuse `activitySchema` too (so their media parses the
  same way) but aren't rendered yet — out of scope for this fix, comments
  with attached photos are rare and this was specifically about the main
  feed.

### 2026-08-27 — Account menu: profile icon + hover dropdown

- User asked to replace the "Name · Log out" header text with a profile
  icon that opens a hover dropdown (account name, "Profile" → the user's
  own `/members/[id]`, "Log out"). Implemented with CSS `group`/
  `group-hover` (no JS-driven open state needed) — a generic person-icon
  SVG trigger, no avatar image, since fetching one would mean extending the
  WP plugin's login/refresh response and redeploying just for this; the
  existing `/members/[id]` route already covers the profile link with no
  backend change.
- Updated `auth.spec.ts` for the new interaction shape (hover the trigger,
  then find the name/links inside the panel) and added a new test for the
  Profile link. Hit real test flakiness here: hovering then immediately
  clicking a dropdown item raced the CSS transition — fixed by explicitly
  waiting for the target to be visible before clicking, the standard
  pattern for hover-menu tests. 24/24 stable across repeated clean runs;
  saw a batch of unrelated timeouts once when running the full suite three
  times back-to-back with no server restart in between (matches the
  known cold-compile pattern under resource pressure, not a regression).

### 2026-08-27 — Fixed logout: real bug, worse than the earlier optimistic-UI fix

- User reported logout not working on the deployed site (login worked). My
  E2E test only checked the client's optimistic UI state, which was true
  but wrong — it never proved the server actually cleared the session.
  Strengthened `auth.spec.ts`'s logout test to `page.reload()` afterward and
  re-check, which reproduced the bug locally immediately (previously it
  only surfaced in production, by luck of timing).
- **Root cause**: `<AuthStatus>`'s logout button was `<button
  onClick={() => setUser(null)}>` inside `<form action={logoutAction}>`.
  Calling `setUser(null)` synchronously on click triggers a React re-render
  that switches the component to its "logged out" branch — which unmounts
  the `<form>` itself, *while the browser is still mid-flight submitting
  it natively*. The browser cancels the submission (visible only as a
  console warning: "Form submission canceled because the form is not
  connected") — `logoutAction` never ran at all. This was the fix I added
  earlier in the session for the "logout stays on the same page" problem;
  it silently broke logout itself in the process. Confirmed the actual
  cause with a throwaway debug spec logging every console message and
  request during the click — the network tab showed *a* POST, but to a
  different (unrelated) Server Action triggered by the layout shift, not
  `logoutAction`.
- **Fix**: `<AuthStatus>` now calls `logoutAction()` directly (via
  `useTransition`, not a native `<form action>`), and only updates local
  state + `router.refresh()` after the action's promise resolves — nothing
  unmounts mid-submission anymore. `logoutAction` no longer calls
  `redirect()` itself (that was for the form-based flow); the client
  handles the UI update since logout always happens from a page the user
  is already on. Also hardened `clearSessionCookies()`/`proxy.ts`'s cookie
  clearing to set explicit matching attributes instead of relying on
  `.delete()`'s own defaults, and made `proxy.ts` skip Server Action
  requests entirely (detected via the `next-action` header) so it can never
  race a login/logout action's own cookie writes on the same request —
  both defensive, not confirmed as contributing to this specific bug, but
  correct regardless.
- Lesson for future auth work: an E2E assertion on optimistic client state
  proves the UI *looks* right, not that the server did the thing. Reload
  after any action that's supposed to change server-side session state.

### 2026-08-27 — Phase 3: Auth (JWT plugin, login/logout, session refresh)

- **Plugin** — `wp/plugin-headless/` (new, tracked in git), deployed via a
  new `./scripts/push-plugin` (separate from `./scripts/push`, which only
  syncs from the gitignored `./remote/` mirror — the plugin's source lives
  in git instead). Deployed and activated on the live site as
  `headless-auth`. Routes under `headless-auth/v1`: `/login`, `/refresh`,
  `/revoke`. JWT secret auto-generates into a non-autoloaded WP option on
  first use — never a `wp-config.php` constant, never committed (repo is
  public). Refresh tokens are `"<user_id>:<random>"`, hashed before storage
  in that user's own `user_meta` (O(1) lookup, no global scan), rotated on
  every use (old token rejected on replay — verified live).
- **Verified end-to-end against the live site via curl**, not just unit
  tests: login issues tokens; `GET /buddyboss/v1/members/me` (unauthenticated)
  correctly 401s and (with the Bearer token) correctly resolves to the test
  user — proving `determine_current_user` actually feeds BuddyBoss's real
  permission stack, which is the thing `PLAN.md`'s PHPUnit requirement was
  ultimately trying to prove; refresh rotates and rejects replay of the old
  token; revoke invalidates; bad credentials return a generic 401 (doesn't
  leak whether a username exists).
- **PHPUnit** (`wp/plugin-headless/tests/`, 17 tests) stubs the WP functions
  our classes call and tests the actual production classes against those
  stubs — not a full WP-bootstrapped integration test, since that needs a
  local WP test install this project deliberately doesn't have. See
  `DECISIONS.md`.
- **Frontend**: `/login` (Server Action `loginAction`, generic error message
  on bad credentials — matches the plugin's own generic error, so failed
  logins never confirm a username exists), `logoutAction`, three cookies
  (`hl_access`/`hl_refresh` httpOnly; `hl_user` **not** httpOnly — just
  display info, read client-side so the header doesn't need `cookies()`
  server-side and force every route dynamic). `getActivityFeed` takes an
  optional `accessToken` — set, it's `cache: "no-store"`; unset, the
  existing anonymous ISR path. Only `/` actually calls `cookies()`, so it's
  the only route that lost static rendering — every other list page
  (`/blog`, `/groups`, `/forums`, `/members`) stayed static, confirmed in
  the build output.
- **`middleware.ts` → `proxy.ts`**: hit a real Next 16 breaking change mid-session
  (the file convention was renamed; build warned about it). Renamed the file,
  the exported function (`middleware` → `proxy`), and its `config.matcher`
  stayed the same. Proxy refreshes the access token proactively before a
  page renders if it's within 5 minutes of expiry — this is what "refresh
  and retry in wp-fetch" actually became, since a Server Component can't
  write cookies mid-render (see `DECISIONS.md`).
- **Two real bugs found and fixed via E2E tests, not caught by eyeballing
  the code:**
  1. Double-encoded `hl_user` cookie — manually called `encodeURIComponent()`
     before handing the value to Next's cookie APIs, which already encode it
     themselves. Client-side `decodeURIComponent()` only undid one layer,
     leaving mangled JSON that silently failed `JSON.parse` (caught, so it
     just looked like "not logged in" rather than throwing visibly). Found
     by dumping `page.context().cookies()` in a throwaway debug test when
     the real test's symptom (header not updating) didn't point at the
     cause directly.
  2. `<AuthStatus>` only read the session cookie in a mount-only
     `useEffect([])`. Since it lives in the root layout, which App Router
     keeps mounted across navigations, it never noticed a login (which
     redirects `/login` → `/`) — the header stayed stuck on "Log in" after
     a successful login. Fixed with `usePathname()` as the effect's
     dependency (catches login, since the path changes) plus an optimistic
     `setUser(null)` in the logout click handler (catches logout, which
     redirects back to the same `/` the pathname trick wouldn't detect).
- Created a dedicated test account (`headless-test`, subscriber role, ID 25)
  via wp-cli rather than reusing an existing account, per `CLAUDE.md`.
  Credentials in `apps/web/.env.local` only (gitignored) — `auth.spec.ts`
  skips itself if unset.
- 3 new E2E tests (login shows account + logs out, wrong password shows a
  generic error, activity feed renders with no console errors while logged
  in) — stable across two full runs, 23/23 passing total.

### 2026-08-27 — Blog (Phase 2 complete)

- Built `/blog` (list, infinite scroll + search) and `/blog/[slug]` (single
  post). First screen backed by `wp/v2/posts` (WordPress core) instead of
  `buddyboss/v1` — per `CLAUDE.md`, the blog uses core, not a BuddyBoss route.
- Much smoother than forums: `?_embed=author,wp:featuredmedia` resolves the
  author's name/avatar and the featured image in the same request — no
  batched lookup or N+1 workaround needed here, unlike topics/replies.
  `postAuthorName`/`postAuthorAvatar`/`postFeaturedImage` helpers in
  `packages/types/src/post.ts` centralize pulling those out of `_embedded`
  so callers don't repeat the optional-chaining.
- Single post route resolves by slug (`?slug={slug}`), not numeric ID —
  more natural for a blog URL than `/blog/673`.
- Reused `<AuthorAvatar>` from the forums work for the post byline avatar.
- Added unit tests for the schema (including the `_embedded`-absent case,
  when `_embed` isn't requested) and 4 E2E tests — all passed twice in a row
  on a fresh dev server.
- **Phase 2 is done** — every screen in `PLAN.md`'s Phase 2 list is live:
  blog, members, profile, activity, groups, forums.

### 2026-08-27 — Forums (list, topics, replies)

- Built `/forums` (list), `/forums/[id]` (forum + topic list), and
  `/forums/[id]/topics/[topicId]` (topic + reply list, all infinite-scroll
  where the API is paginated). Backed by `GET /buddyboss/v1/forums`,
  `/topics`, and `/reply`.
- **Real gotcha found via OPTIONS introspection, not guessing:** filtering
  topics/replies by parent forum/topic uses the query param `parent` — not
  `forum_id` or `forum`, even though those are literally the field names in
  the response body. Using the wrong param name doesn't error; it silently
  returns the unfiltered list (BuddyBoss's usual 200-with-wrong-data
  pattern). Confirmed the right param via
  `curl -X OPTIONS .../buddyboss/v1/topics`.
- Topics/replies are bbPress post-type objects — author is a bare numeric
  ID, no embedded name or avatar (unlike activity/members/groups). Added
  `getTopicsWithAuthors`/`getRepliesWithAuthors`/`getTopicWithAuthor` to
  `packages/api-client`, resolving display info with one batched
  `?include=id1,id2,...` member lookup per page rather than an N+1 fetch.
- That batch lookup doesn't always resolve every ID (confirmed live: one of
  three requested IDs came back missing, likely a deleted user) — the
  fallback avatar URL was `""`, which crashes `next/image`'s `src` prop.
  Fixed with a new shared `<AuthorAvatar>` that renders a placeholder circle
  instead of an `<Image>` when the src is empty, used everywhere a
  topic/reply author avatar renders.
- One E2E test flaked on the first run twice, always the deepest new route
  (`/forums/[id]/topics/[topicId]`) — Next dev compiles a route on first
  visit, and clicking through to a brand-new doubly-nested route occasionally
  outran the default 5s navigation timeout. Confirmed it wasn't a real bug
  (passed reliably once the route was warm) and extended that one
  assertion's timeout rather than leaving it flaky. Won't happen against the
  prebuilt Vercel deploy.
- Added a "Forums" link to the header nav, unit tests for
  forum/topic/reply schema parsing, and 4 E2E tests — all passed cold
  (fresh dev server) on the final run.

### 2026-08-27 — Groups directory + detail page

- Built `/groups` (directory, infinite scroll + search — same pattern as
  `/members`) and `/groups/[id]` (cover, avatar, name, status, member
  count, description, and the group's member list). Both backed by
  `GET /buddyboss/v1/groups` / `/groups/{id}` / `/groups/{id}/members`.
- Extracted `MemberCard` out of `members-list.tsx` into a shared
  `app/member-card.tsx` so the group detail page's member list could reuse
  it directly — group members are literally member objects.
- Added a "Groups" link to the header nav.
- Learned from the earlier `link`-field mistake on the members page: group
  cards were built pointing at `/groups/${id}` (internal route) from the
  start, never `group.link` — grepped to confirm no `.link`/`.user_link`
  leaked into an href.
- Unit test for `groupListSchema` (loose `members_count`) and 4 new E2E
  tests (directory renders, search narrows to a real group, nav link, and
  detail page shows both the group and its members) — all passed against
  the live API on the first run, stable across two full suite runs.

### 2026-08-27 — Member profile page (fixing a BFF architecture leak)

- User spotted that clicking a member in the directory navigated to the raw
  WordPress domain (`st2-rezwan.hz2.developbb.dev/members/...`) — the API's
  `link` field was used directly as the href. That breaks the core rule in
  `CLAUDE.md`: the browser never talks to WordPress directly. Fixed by
  linking to an internal route (`/members/[id]`) and building a minimal
  profile page (avatar, cover, name, member-since, last-active) backed by
  `GET /buddyboss/v1/members/{id}`, rather than leaving a dead link.
  Grepped the rest of the app for the same pattern (`.link`/`.user_link`
  used as an href) — this was the only leak.
- `memberDetailSchema` extends `memberSchema` with `cover_url`; xprofile
  fields are skipped for now (not needed for this minimal profile).

### 2026-08-27 — Member directory (Phase 2 begins)

- User asked to like posts from the deployed frontend — explained that
  requires auth (Phase 3: JWT plugin, login/logout, cookie sessions), which
  doesn't exist yet, and that faking it client-side would mean embedding
  write credentials in the browser (a real security hole, not a shortcut).
  User chose to keep the app read-only for now and continue Phase 2 instead.
- Built `/members`: directory with infinite scroll (same TanStack Query
  pattern as the activity feed) and debounced search, both backed by
  `GET /buddyboss/v1/members`. Added a "Members" link to the header nav.
- Factored `looseBoolean`/`looseNumber`/`avatarUrlsSchema` out of
  `activity.ts` into `packages/types/src/shared.ts` — `member.ts` needed
  the same loose-typing helpers, not worth duplicating.
- `getNextPageParam` in the new members list uses each response's own
  `.pages` count rather than a value captured once at mount (which the
  activity feed does) — necessary here since the page count changes when
  the search term changes, unlike the activity feed's fixed total.
- Added E2E coverage: directory renders, search narrows results against a
  real member (Shakeel Ahmad), header nav link works. All passed against
  the live API on the first attempt — the by-now-familiar traps (loose
  types, pagination via headers) were already accounted for in the schema
  from the start this time.

### 2026-08-27 — Rename favorites to likes, add "who liked" popover

- User pointed out BuddyBoss's UI calls this feature "Like" (matches
  `bb_reaction_mode: "likes"` in site settings), not "favorite" — the API's
  internal naming (`favorited`, `favorite_count`) leaked into the display
  text. Relabeled "N favorites" to "N likes" with a thumb icon (inline SVG,
  no icon library).
- Added a "who liked this" popover on click. No new endpoint needed —
  `reacted_names` (already on every activity item) is the number `0` when
  there are no likes, or a comma-separated string of display names
  otherwise. Added `parseReactedNames()` to `lib/format.ts` plus a unit
  test, and a click-away layer to close the popover.

### 2026-08-27 — Threaded (nested) comment replies

- User reported a reply-to-a-comment ("ok", replying to "hi") was missing
  from the expanded thread, though it shows nested on the live site. Cause:
  a comment can carry its own replies recursively under the same `comments`
  key it was itself nested under (arbitrary depth), and `activitySchema`
  didn't model that field at all — zod silently dropped it (extra keys are
  stripped by default), so replies were just never in the parsed data.
  Made `Activity` recursive (`comments?: Activity[]`) via `z.lazy()`, and
  `<ActivityComments>` now renders replies recursively, indented under
  their parent, matching parent→child.
- Same zod generic-variance gotcha as `wp-fetch.ts` (see `DECISIONS.md`)
  showed up again on the explicit `z.ZodType<Activity>` annotation this
  recursive type needs — fixed the same way, loosening `Input` instead of
  pinning it to `Activity`.
- Added a unit test parsing a nested-reply fixture end to end (was worth a
  real test, not just eyeballing the API response — this is exactly the
  kind of shape a hand-written schema misses silently).

### 2026-08-27 — Clickable comment threads

- User reported "N comments" was static text, unlike the live BuddyBoss site
  where it's clickable and expands the thread. Made it a toggle button
  (only when `comment_count > 0`) that fetches and shows the comments —
  read-only, view only. Comments reuse `activitySchema` since
  `GET /buddyboss/v1/activity/{id}/comment` returns items shaped exactly
  like activity items, nested under `{ comment_count, comments: [...] }`.
  Deliberately did **not** add a comment composer/reply box — posting needs
  auth (Phase 3), and a non-functional input would be worse than no input.
- New: `getActivityComments()` in api-client, `loadActivityComments` Server
  Action, `<ActivityComments>` client component (TanStack `useQuery`, lazy —
  only fetches once expanded).
- Added an E2E test clicking a real comment button and asserting real
  content renders (not the empty/error fallback). First version was flaky —
  asserted the "Loading comments…" state was visible before checking it
  disappeared, but a fast/cached response could resolve before the
  assertion ran. Fixed by only waiting for it to be gone.

### 2026-08-27 — Infinite scroll on the activity feed

- User reported the feed only ever showed the first 20 of 195 items with no
  way to load more, unlike the live BuddyBoss site's auto-loading scroll.
  Added `<ActivityFeedList>` (Client Component, TanStack Query
  `useInfiniteQuery`, seeded with the server-fetched first page via
  `initialData` so page 1 isn't re-fetched) plus an `IntersectionObserver`
  sentinel that calls `fetchNextPage()` as the user nears the bottom —
  matches `CLAUDE.md`'s documented pattern ("client-side lists and infinite
  scroll use TanStack Query, calling Server Actions"). Pages 2+ come from a
  new Server Action, `loadActivityPage` in `app/actions.ts`.
- Added `<Providers>` (`QueryClientProvider`) to `app/layout.tsx`.
- Extended the Playwright smoke suite with a scroll-and-count-increases
  check — the existing test only verified the first page rendered, which
  wouldn't have caught this gap.

### 2026-08-27 — Basic site footer

- Added `<SiteFooter>` matching the live BuddyBoss dev site's copyright bar
  ("© {year} – DFY Fresh WordPress Website"). That text is a theme
  customizer setting (`buddyboss_theme_options.copyright_text`), not exposed
  by any REST route — hardcoded in the component (year computed, not
  hardcoded) rather than adding a custom PHP endpoint for one string.

### 2026-08-27 — Basic site header

- Added `getSiteInfo()` (hits WP core `GET /wp-json`, not a buddyboss/v1
  route) and a `<SiteHeader>` Server Component in `app/layout.tsx` showing
  the real site name ("Rezwan Dev site"), linking home. No site icon is
  configured on the dev site (`site_icon_url` is empty), so it falls back to
  text branding — picks up a logo automatically if one gets set later.
  User explicitly deferred full BuddyBoss-style nav/post-card styling
  (like/comment/share, composer, filters) to Phase 2/3, since most of that
  needs auth to be functional.

### 2026-08-27 — Dark mode fix + Vercel short URL

- User reported unreadable text on https://buddyboss.vercel.app in Chrome
  Incognito (dark OS theme). Cause: `globals.css` already defined
  `--background`/`--foreground` CSS vars that flip under
  `prefers-color-scheme: dark`, but every component used hardcoded
  `text-black/*`, `border-black/*`, `bg-black/*` Tailwind utilities that don't
  adapt — black-on-black in dark mode. Fixed by adding `dark:` variants
  throughout `app/page.tsx`, `app/loading.tsx`, `app/error.tsx`, and setting
  `color-scheme: light dark` on `:root` so the browser doesn't also apply its
  own forced-dark heuristic on top. Verified dark mode by eye is still owed —
  Playwright doesn't check this; flagging per `CLAUDE.md`'s manual-review note.
- Renamed the Vercel project `web` → `buddyboss` and claimed the short alias
  `buddyboss.vercel.app`. Learned the hard way that a manual
  `vercel alias set` does **not** auto-follow new deploys the way the
  project-name-based URLs do — see the gotcha note under Live URL above.

### 2026-08-27 — Phase 1: Next.js scaffold + activity feed

- Installed pnpm (Homebrew, avoids the sudo-gated global npm/corepack path)
  and set up a pnpm workspace: `apps/web` (Next.js 16, App Router, TypeScript
  strict, Tailwind, Biome — no ESLint) plus `packages/types` and
  `packages/api-client`.
- `packages/api-client/src/wp-fetch.ts` — the single transport, no auth yet.
  `wpFetchJson`/`wpFetchList` take a parse callback rather than a zod schema
  type; see `DECISIONS.md` for why (`.catch()` + generic zod schemas don't mix
  well with TS inference).
- `packages/types/src/activity.ts` — Activity zod schema informed by the real
  `docs/samples/buddyboss-v1-activity.json` shape. Caught a real bug in
  development: `z.coerce.boolean()` treats the string `"0"` as truthy (JS
  coercion, not PHP), so BuddyBoss's `"0"`/`"1"` boolean fields came out
  wrong until replaced with an explicit string-aware coercion. A unit test
  fixture built from the loose-typed live shape is what caught it.
  `packages/types/scripts/draft-schema.ts` is a rough schema-drafting tool for
  future endpoints — prints a starting point, not final output.
- `/` (activity feed) is a Server Component rendering real data via
  `getActivityFeed()`, with loading and error states. Avatars go through
  `next/image` with `remotePatterns` derived from `WP_URL` (no hardcoded
  hostname).
- Added Vitest (unit tests) and Playwright (`@playwright/test`, smoke E2E
  tagged `@smoke`) to `apps/web`. `pnpm verify` = typecheck + lint + unit +
  smoke E2E, all passing. `pnpm build` succeeds (ISR, 30s revalidate on `/`).
- `.mcp.json` added for the Playwright MCP (for Claude Code to drive a browser
  directly) — not yet active this session; see Blockers.
- Logged into Vercel CLI, linked project `web` under team `bb-0056`, set
  `WP_URL` in all three Vercel environments, connected the GitHub repo (needed
  both a login connection *and* installing Vercel's GitHub App with repo
  access — two separate steps), and set Root Directory to `apps/web`.
- Made a mistake testing this: ran `vercel deploy` directly from the repo
  root, which tried to upload the whole working tree from disk (55k+ files,
  including the untracked `remote/` mirror) instead of the git-tracked set,
  and along the way created a second, misconfigured Vercel project. Deleted
  the stray project and its dangling `.vercel/` link; the correct `web`
  project is untouched. Lesson: don't run `vercel deploy` from local disk in
  this repo — let the GitHub integration trigger builds from git-tracked
  files only.
- `apps/web/.env.local` (not repo-root `.env.local`) is where `WP_URL` lives
  now — Next.js only auto-loads env files from its own directory.

### 2026-08-27 — Phase 0 complete: API introspection

- Added `WP_URL=https://st2-rezwan.hz2.developbb.dev` to `.env.local`
- Wrote `scripts/introspect-api.ts` — GET-only, unauthenticated (no auth exists
  yet), fetches every route in `docs/routes.txt` and writes the raw response to
  `docs/samples/<slug>.json`. Runs directly via `node` — Node 24 strips TS types
  natively, no ts-node/tsx needed.
- Regex path placeholders (e.g. `(?P<id>\d+)`) resolved to real IDs pulled from
  the live site (member 3, activity 373, group 5, forum 702, topic 196, reply
  290, xprofile field/group 1) so samples reflect real data, not 404s, where
  content exists. Media/video/document/poll tables are empty on this site, so
  those routes sampled a 404 — still a useful shape.
- Ran it: 152/152 routes fetched, 0 errors. ~948K of samples on disk.
- Phase 0 is done — every item in `PLAN.md` is checked off.

### 2026-08-27 — Setup

- Created project at `~/buddyboss-headless`
- SSH key auth working to the BuddyBoss dev site (key at `~/.ssh/bb/id_bb`)
- Confirmed WP-CLI 2.11 and MariaDB available on the server, so no local
  WordPress install is needed
- Built `./scripts/wp`, `./scripts/pull`, `./scripts/push`
- Pulled the WordPress root (~900MB) into `./remote/`
- Captured 153 `buddyboss/v1` routes into `docs/routes.txt`
- Confirmed all 16 BuddyBoss components active, Platform Pro installed
- Verified write access end to end by creating a BuddyBoss activity post
- Wrote `CLAUDE.md`, `PLAN.md`, `PROGRESS.md`, `DECISIONS.md`
- Created Vercel account and GitHub repo
  (https://github.com/rezwan2024/buddyboss-headless, public)
- Confirmed `remote/` and `.env.deploy` are gitignored — the repo is public, so
  neither may ever be committed

---

## How to update this file

At the end of a session, Claude Code should:

1. Update **Current state** — phase and the single next task, taken from `PLAN.md`
2. Add or clear **Blockers**
3. Add any new env var to the **Env vars** table
4. Add a dated entry to **Session log** — what changed, in a few bullets
5. Append to `DECISIONS.md` if a non-obvious choice was made

Before marking a task done, check it against **Definition of done for a task** in
`CLAUDE.md`.

Don't restate the plan here — that's `PLAN.md`. Don't explain reasoning here —
that's `DECISIONS.md`.
