# PROGRESS.md

Living state of the project. Claude Code reads this at the start of every session
and updates it at the end. Newest entries at the top.

Keep it short. This is a status file, not a diary. Scope lives in `PLAN.md`,
reasoning in `DECISIONS.md`, rules in `CLAUDE.md`.

---

## Current state

**Phase:** 6 — Production hardening — **done**. Caching audit, error
boundaries/404/500 pages, cookie-flags-per-environment review, Lighthouse
pass, rate limiting on login, cache revalidation webhook — all shipped
and verified live. Post-Phase-6: user-requested fixes/polish, taken one
at a time (see session log) — header layout, site-wide font size, a
3-column dashboard layout for the activity home page, icon-only header
nav for messages/notifications, self-service sign-up, a LearnDash
courses feature (catalog, enrollment, lessons/topics, completion
tracking), and a scoped activity feed + composer on member profiles and
group pages.
**Next task:** none currently planned — awaiting the next item in that
list from the user.

## Blockers

The production crash reported earlier this session ("Minified React error
#441" on posting with an image) — fix shipped (retry idempotent WP GETs
once on a network-level failure) and **confirmed working** by the user
against production afterward. Root cause was never caught with certainty
(circumstantial evidence: this project's own `pnpm verify` independently
hit `ECONNRESET` against the remote WP host in the same session), so if
something *like* it recurs, don't assume it's the same bug — start `vercel
logs buddyboss.vercel.app --follow` *before* reproducing, to catch the
actual digest/stack trace live instead of guessing again.

The Playwright MCP (`.mcp.json`) is confirmed working in-session — used it
directly to log in, post, and screenshot the result against both localhost
and the live production URL.

**The remote WP dev site struggles under concurrent load.** Confirmed
2026-08-28: running the full `@smoke` e2e suite with Playwright's default
4 parallel workers caused widespread timeouts and `ECONNRESET` errors —
including on routes untouched by that session's changes (`/groups`,
`/members`, `/forums`, `/blog`), ruling out a code regression. A single
direct request against the WP API responded normally (~2s) both before
and after; `--workers=1` brought the suite back to 23/25 passing. Not
something to fix in this repo — it's the shared host's own concurrency
ceiling. If `pnpm verify`/`pnpm test:e2e` looks unexpectedly bad, try
`pnpm exec playwright test --grep @smoke --workers=1` before assuming a
real regression.

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
| `TEST_USER2_LOGIN` / `TEST_USER2_PASSWORD` | Second dedicated WP test account (`headless-test-2`, user ID 27, subscriber role) — needed for two-way flows a single account can't verify alone (messages, receiving/accepting a friend request). Local-only, same as `TEST_USER_LOGIN` above — **not** in Vercel, no test currently automates against it (used for manual Playwright MCP verification only). |
| `REVALIDATE_SECRET` | Shared secret authorizing `wp/plugin-headless`'s `save_post` webhook → `POST /api/revalidate`. Must exactly match the WP `headless_revalidate_secret` option (`./scripts/wp option get headless_revalidate_secret`). Set in `.env.local` and all three Vercel environments (via `vercel env add`). |

---

## Session log

### 2026-08-29 — Scoped activity feed + composer on member profiles and group pages

- User reported the activity feed was missing from member profile and
  group pages, and asked for a post-creation composer on the group feed.
- The existing `getActivityFeed`/`createActivity`
  (`packages/api-client/src/activity.ts`) had no scoping — every call hit
  the same global `/buddyboss/v1/activity` feed. Confirmed live, not
  assumed, exactly which query/body params actually scope this endpoint
  (curl against the real API, then cleaned up every test post/document
  created along the way):
  - **GET scoping:** `user_id={id}` correctly filters to one member's
    activity; `component=groups&primary_id={id}` correctly filters to one
    group's stream. The naturally-guessable `item_id` param does **not**
    filter (silently returns every group's activity regardless of value) —
    `primary_id` is the one that matters.
  - **POST scoping is a different param name from GET**, confirmed by
    posting for real and checking where it landed: `POST /activity` takes
    `component`+`primary_item_id` (not `primary_id`) to post into a group.
    `POST /media`, `/video`, and `/document` (the attach-a-file endpoints)
    instead take a plain `group_id` — a third naming convention for the
    same concept, confirmed by reading `class-bp-rest-media-endpoint.php`/
    `class-bp-rest-document-endpoint.php` and then testing each live.
  - **Posting into a group you're not a member of is correctly rejected**
    server-side with a real 403 (`bp_rest_authorization_required`) —
    confirmed live with the test account against a group it doesn't
    belong to, so the group composer's `is_member` gate is a real
    permission match, not just a UI nicety.
- `getActivityFeed` gained optional `userId`/`groupId` params;
  `createActivity`, `attachMediaOrVideo`, and `attachDocument` gained an
  optional `groupId` (mapped to whichever of the three actual param names
  applies). `postActivityAction` now takes a bound `groupId` (same
  `.bind(null, ...)` pattern `comment-action.ts` already uses to
  parametrize by activity id). `ActivityFeedList` gained an optional
  `scope` prop (`{type: "member"|"group", id}`) that changes both its
  pagination loader and its query key — kept prefixed with
  `"activity-feed"` regardless of scope, so the existing broad
  `invalidateQueries({queryKey: ["activity-feed"]})` calls in the
  composer/likes/comments code keep working unchanged across every scope
  via TanStack Query's prefix matching.
- Member profile's composer only shows on **your own** profile — this
  install doesn't have (or wasn't confirmed to have) "post on someone
  else's wall" enabled, so posting is scoped to the viewer's own feed the
  same way `createActivity` already worked before this change. Group
  composer shows to any member of that group (gated on `group.is_member`,
  already fetched by the existing membership-button code).
- Attachments (photo/video/document) work in the group composer too, not
  just text — verified live end-to-end with a real document upload scoped
  via `group_id`, confirmed it landed in the group's stream via a direct
  API read, then cleaned up (the REST `DELETE /document/{id}` route
  403'd for the uploader — `bp_rest_authorization_required` — despite
  being the owner; had to leave that one test document/activity for
  manual cleanup since WP-CLI cleanup commands were blocked by this
  session's own auto-mode classifier. **Not yet cleaned up on the live
  site:** a "test-upload.txt" document post in group 9 ("open"), activity
  id 446/document id 16 — safe to delete via wp-admin or WP-CLI whenever
  convenient).
- Verified live via Playwright MCP: posted a real text activity into
  group 9 (only group the test account belongs to) — appeared
  immediately in the group's feed with no reload, confirmed scoped
  correctly via a direct API read (`primary_item_id: 9`), then deleted
  through the account's own delete permission. Confirmed the composer is
  hidden on another member's profile (id 26) while their real activity
  history (forum posts, likes, a document, several text updates) renders
  correctly; confirmed it *is* shown on the logged-in account's own
  profile (id 25).
- `pnpm verify` (24/25 e2e, `--workers=1` — the one failure is the same
  pre-existing `getByText("Headless Test Account")` ambiguous-match
  fragility on the homepage documented earlier in this log, unrelated)
  and `pnpm build` pass.
- **What to look at:** any group page you're a member of (e.g.
  `/groups/9`) — composer + scoped feed should appear above the member
  list; any member's own profile shows the same for their own posts,
  hidden when viewing someone else's. Also: there's one leftover test
  document post on group 9 from this session's live API verification
  (see above) worth deleting when convenient.

### 2026-08-29 — Phase 7: LearnDash courses (catalog, enrollment, lessons/topics, completion)

- User asked for LearnDash courses — the first `PLAN.md` "out of scope,
  revisit only after Phase 6" item, now that Phase 6 is done. Scoped down
  first (courses + lessons/topics + completion, deferring quizzes/
  assignments/certificates — see `PLAN.md`'s new Phase 7) since the full
  API surface (quiz start/save/next/prev/check/leaderboard, assignment
  file uploads) is genuinely a separate slice's worth of work.
- Researched rather than assumed: this site actually has *five* different
  LearnDash-adjacent REST namespaces active (`ldlms/v1`, `ldlms/v2`,
  `learndash/v1`, `buddyboss/v1/learndash/courses`, `buddyboss-app/learndash/v1`).
  `ldlms/v2` (LearnDash's own official API) 403s for a plain subscriber;
  the single `buddyboss/v1/learndash/courses` bridge route has no
  detail/lesson/topic/enroll/complete routes at all. `buddyboss-app/learndash/v1`
  — the same REST API BuddyBoss's own official mobile app uses — is the
  one that actually works end-to-end for a non-admin user, confirmed live
  for every route this slice needed.
- New `packages/types/src/learndash.ts` and `packages/api-client/src/learndash.ts`
  (`getCourses`, `getCourse`, `enrollInCourse`, `getCourseLessons`,
  `getLesson`, `setLessonComplete`, `getLessonTopics`, `getLessonTopic`,
  `setLessonTopicComplete`). New routes: `/courses` (catalog),
  `/courses/[id]` (detail — cover, enroll button or progress bar, lesson
  list), `/courses/[id]/lessons/[lessonId]` (content + topic list),
  `/courses/[id]/lessons/[lessonId]/topics/[topicId]` (content + mark
  complete/incomplete). "Courses" added to the header nav.
- **Two real bugs in the live BuddyBoss App API found and worked around,
  both confirmed live before assuming the frontend code was at fault:**
  1. **A response cache not keyed by user.** Every `buddyboss-app/learndash/v1`
     GET carries an `x-app-api-cache` header — confirmed this is a real
     server-side cache, and it's keyed on the request URL only, *not* the
     Authorization header: three identical requests with a real, valid
     bearer token returned `has_course_access: false` every time
     (`x-app-api-cache: hit`) for an account independently confirmed
     enrolled via `ld_course_check_user_access()` over `wp eval`.
     Whichever user's request happens to populate the cache for a given
     URL is what every other user sees afterward. A throwaway query
     param forces a cache miss and the correct, per-user value — applied
     to every authenticated read in `learndash.ts` (`cacheBust()`).
     `Cache-Control`/`Pragma: no-cache` request headers do not help.
  2. **The topics endpoint's `lesson_id` filter doesn't filter.** Unlike
     `course_id` on the lessons endpoint (confirmed real — a bogus id
     correctly returns an empty array), `topics?lesson_id=` always
     returns every topic for the whole course. Caught by an actual UI
     bug during verification (a lesson page showed 4 topics instead of
     2, including one from a different lesson). Fixed by filtering
     client-side on each topic's own real `lesson` field instead of
     trusting the query param.
  3. Smaller, expected finding: LearnDash's own sequential-progress rule
     rejected an out-of-order "mark complete" with a real, human-readable
     error ("You must complete each lesson/topic in sequence.") — not a
     bug, but the action's error handling was rewritten to surface that
     real message instead of a generic "try again" once it showed up
     during testing.
- Verified live end-to-end via Playwright MCP: catalog → course detail →
  enroll → lesson list → lesson → topic → mark complete (correctly
  blocked by sequence rule, then succeeded once the prerequisite was
  done) → course progression updated (0% → 16% → 66% as real actions
  were taken). Test enrollment/progress state left on the dedicated
  `headless-test` account (not cleaned up) — matches this project's
  existing convention that test-account state, unlike shared/visible
  content, doesn't need scrubbing.
- `pnpm verify` (24/25 e2e, `--workers=1` — the one failure is the same
  pre-existing locator fragility documented earlier, unrelated) and
  `pnpm build` pass.
- **What to look at:** `/courses` — the one real course on this install
  ("test") should show real enrollment/progress numbers that update as
  you enroll, open lessons/topics, and mark them complete.

### 2026-08-29 — Fix: header stuck showing "logged out" after logout then a different login

- User reported: sign up (auto-login worked), log out (worked), then log
  in as a *different* account — header still showed "Log in"/"Sign up"
  until a manual page reload.
- Real, pre-existing bug in `<AuthStatus>`, unrelated to the signup code
  itself — signup was just the first natural way for the user to hit
  this exact sequence (create an account, log out of it, log into an
  existing one). Root cause: `handleLogout()` sets a local `loggedOut`
  boolean to force the logged-out view (since logout doesn't navigate,
  so `useSessionUser()`'s pathname-triggered cookie re-check never
  fires) — but nothing ever set it back to `false`. A subsequent login
  *does* navigate, so the cookie hook correctly picked up the new user,
  but `user = loggedOut ? null : cookieUser` kept forcing `null` forever,
  because `loggedOut` only resets on a full remount.
- Fix: a `useEffect` that clears `loggedOut` whenever the cookie hook
  reports a real user again. Reproduced the exact bug live first (logged
  in, logged out via direct DOM `.click()` on the hover-only menu — real
  mouse hover doesn't simulate cleanly through Playwright's MCP tools for
  a CSS `group-hover` dropdown, so the fix was verified by invoking the
  actual handler, not by fighting the hover interaction), confirmed the
  header stayed on "Log in" after logging into a second account, applied
  the fix, and reproduced the same sequence again — header now updates
  immediately, no reload needed.
- `pnpm verify` (25/25 e2e, `--workers=1`, clean/fast — no hint of the
  usual WP-backend-load flakiness this run) and `pnpm build` pass.
- **What to look at:** log out, then log in as a different account (or
  just log in again) — the account menu should appear immediately.

### 2026-08-29 — Self-service sign-up

- User reported sign-up was missing entirely — only login existed.
  Researched rather than assuming a custom endpoint was needed: BuddyBoss
  already exposes a full signup REST API (`/buddyboss/v1/signup` +
  `/signup/form`), and `users_can_register`/`blog_public` are both
  already enabled on the live site — matches `CLAUDE.md`'s "use
  BuddyBoss's shipped REST API" rule, no plugin change required.
- Confirmed live via curl before writing any code: `/signup/form` lists
  the actual required fields for this install (email, password, First
  Name, Last Name, Nickname); a real test signup showed the **response
  is a bare 302 redirect, not JSON** (`packages/api-client/src/signup.ts`
  uses `redirect: "manual"` so `wpFetch` never follows it into raw WP
  HTML); a validation failure (duplicate email/nickname) is a real 400
  with per-field messages; **`field_3` (Nickname) is the actual
  `user_login`** — confirmed by checking the created user in the
  database, not by guessing from the field's label. The UI labels this
  field "Username" (what it actually does), not "Nickname" (BuddyBoss's
  internal label).
- Also confirmed the created account is immediately usable — no email
  activation step on this install — by logging in with it right after
  creation. `signupAction` (`auth-actions.ts`) chains straight from
  `signUp()` into the existing `login()` call and sets session cookies,
  so a new user lands on `/` already signed in rather than being sent to
  a separate login screen.
- New `/signup` route (`signup/page.tsx` + `signup-form.tsx`, same
  `useActionState` pattern as the login form) with per-field error
  display under each input. Reused `lib/rate-limit.ts` for signup
  spam, keyed separately from login's (`signup:${ip}` vs `login:${ip}`)
  so failed attempts at one don't lock out the other. Added "Sign up" /
  "Log in" cross-links on both pages, and a "Sign up" link next to
  "Log in" in the header for logged-out visitors.
- Verified live via Playwright MCP: a full real signup (unique
  email/username) correctly created the account, auto-logged in, landed
  on `/` with the new name in the account menu; a duplicate-credentials
  resubmit correctly showed "Nickname has already been taken." and
  "Sorry, that email address is already used!" under the right fields.
  Test accounts deleted afterward (`wp user delete`) — confirmed no
  orphaned `bp_activity` rows this time (BuddyBoss auto-posts a "became a
  registered member" activity per signup; `wp user delete` cascaded it
  correctly, unlike the earlier forum-post gotcha).
- `pnpm verify` (24/25 e2e with `--workers=1` — the one failure is the
  same pre-existing locator fragility documented earlier, unrelated) and
  `pnpm build` pass; `/signup` is statically rendered.
- **What to look at:** `/signup` — fill it in, or try submitting an
  existing email/username to see the field-level errors.

### 2026-08-28 — Header: icon-only messages/notifications, grouped with account menu

- User asked to replace the "Messages"/"Notifications" text nav links
  with icons, grouped beside the account menu on the header's right edge
  in order: notifications, messages, profile.
- `messages-nav-link.tsx`/`notifications-nav-link.tsx` now render an
  icon-only button (chat bubble; bell with the unread badge overlaid on
  the icon instead of trailing it), matching `<AuthStatus>`'s existing
  account-icon button style. Moved out of the centered nav `<div>` in
  `site-header.tsx` into the same right-edge group as the account menu.
- Fixed a real, if minor, bug this surfaced: `activity-feed.spec.ts`'s
  scrolling test asserted on unscoped `page.locator("li")` counts —
  scoped to `main li` (the sidebar work two entries below already needed
  this same fix for its own `<li>`s; this was the same class of issue,
  different trigger).
- `pnpm verify` (`--workers=1`) and `pnpm build` pass. Verified live via
  Playwright MCP: icons render in the right order, notification badge
  still shows, messages link still navigates correctly.
- **What to look at:** the header's top-right corner — bell, chat
  bubble, then the account avatar, in that order.

### 2026-08-28 — Activity home page: 3-column dashboard layout

- User asked to match a reference BuddyBoss community site's home page:
  left sidebar, center feed, right sidebar. Scoped down to this app's real
  features rather than a literal clone — the reference's Events/Courses
  (LMS)/curated Links sections don't map to anything this app has (see
  `PLAN.md`'s explicit LMS-out-of-scope note). Per the user's own
  clarification: left sidebar gets "Latest Discussions" (recent forum
  topics site-wide) and "Groups" (the logged-in user's own joined
  groups); right sidebar gets "Complete your profile" (a real, computed
  percentage — not a placeholder) and "Latest updates".
- New `packages/api-client/src/xprofile.ts` (`getXProfileFieldDefinitions`,
  the canonical per-install field list, ISR-cached — it's the same for
  every viewer), `getRecentTopics` in `forums.ts` (site-wide latest
  topics, no `parent` filter — confirmed live the unfiltered collection
  is already sorted by recency), and an optional `userId`/`accessToken`
  on `getGroups` (confirmed live via `?user_id=` — filters to a member's
  actual joined groups).
- `memberDetailSchema` gained `xprofile` (a member's own filled-in
  fields — confirmed live that BuddyBoss omits an unfilled field
  entirely rather than sending it empty) and `avatar_urls.is_default`/
  `cover_is_default` (booleans BuddyBoss already computes for exactly
  this "has a real photo?" question — no extra logic needed).
- New `lib/profile-completeness.ts` (`computeProfileCompleteness`) —
  counts only *required* xprofile fields (cross-referencing a member's
  filled fields against the canonical definitions) plus avatar/cover, not
  every optional field this install happens to have configured. 3 unit
  tests built directly from real, live-verified data shapes (a
  partially-filled real profile, a fully-filled one, and one with only
  optional fields filled — confirms optional fields don't count).
- Four new sidebar cards (`home-*-card.tsx`), each its own Server
  Component. "My Groups" and "Complete your profile" render nothing when
  logged out (nothing personal to show); "Latest Discussions" is public.
  "Latest updates" takes the main feed's already-fetched items as a prop
  instead of making its own redundant WP call for near-identical data.
- **Real, if indirect, bug caught along the way:** the e2e suite went
  from its usual ~20s/0-2-flaky to repeated multi-minute runs with 10-24
  failures after this landed. Investigated rather than assuming the new
  sidebars were simply too slow — checked the dev server's own request
  log first, which showed 10-30s+ response times and `ECONNRESET` on
  routes this change never touched (`/groups`, `/members`, `/forums`),
  proving it wasn't a code defect. Traced to the shared remote WP dev
  site's concurrency ceiling under Playwright's 4 parallel workers (see
  Blockers) — confirmed by `--workers=1` bringing the suite back to
  23/25. Still made two real improvements while investigating: wrapped
  each sidebar card in its own `<Suspense>` (so the feed streams as soon
  as its own fetch resolves, not gated on every sidebar's data too), and
  eliminated "Latest updates"' redundant fetch entirely (reuses the
  page's own feed data).
- `pnpm verify` (with `--workers=1` for the e2e portion — see Blockers),
  `pnpm build` pass. Verified live via Playwright MCP: profile
  completeness showed 29% for `headless-test` with a correct 2/5 required
  fields breakdown, matching the number independently computed by hand
  from the same live data during the unit-test-writing step; groups,
  discussions, and updates all rendered real data with correct links.
- **What to look at:** the home page (`/`) at a wide viewport (sidebars
  hide below `lg`, ~1024px) — left sidebar (Latest Discussions, your
  Groups), right sidebar (Complete your profile %, Latest updates).

### 2026-08-28 — Header layout + site-wide font size

- User feedback with a screenshot: header content was squeezed into the
  same narrow `max-w-2xl` column as page content, logo and nav bunched
  together on the left with large empty margins on wide screens; text
  throughout the site read too small.
- Rewrote the header as a full-width 3-column grid (`grid-cols-[1fr_auto_1fr]`) —
  logo pinned to the left edge, nav centered in the available space,
  account menu pinned to the right edge. No `max-w` cap, deliberately —
  the arrows in the user's screenshot pointed at the true browser edges,
  not a capped-but-still-centered column.
- Bumped the root `font-size` from the 16px browser default to 18px in
  `globals.css` — every Tailwind `text-*` utility is `rem`-based, so this
  scales every size in the app proportionally (headings, body copy, meta
  text) without touching each `className` individually.
- Fixed a real bug this surfaced in an existing e2e test: `scrolling
  loads more activity` asserted on `page.locator("li")` counts across the
  *whole page* — harmless before, since only the main feed had any
  `<li>` elements, but wrong once the same page could have unrelated
  `<li>`s elsewhere. Scoped to `main li` instead (see the sidebar entry
  above for what would have broken it for real).
- Verified live via Playwright MCP at 1600px, 2400px, and 375px — logo/
  nav/account correctly pinned at the two wider sizes; noted (not fixed,
  out of scope for this ask) that the header's nav item list doesn't wrap
  or scroll at 375px and overflows — pre-existing before this change too,
  flagged to the user rather than silently left unmentioned.
- `pnpm verify` and `pnpm build` pass.
- **What to look at:** the header at a normal desktop width — logo far
  left, nav centered, account icon far right. Text throughout should read
  noticeably larger than before.

### 2026-08-28 — Phase 6: Cache revalidation webhook — done, Phase 6 complete

- New `POST /api/revalidate` Route Handler (`apps/web/app/api/revalidate/route.ts`):
  authorized by a shared secret (`REVALIDATE_SECRET`, timing-safe compared),
  maps a WordPress post type to the fetch tag it's cached under
  (`post`→`posts`, `forum`/`topic`/`reply`→`forums`) and purges it
  immediately via `revalidateTag(tag, { expire: 0 })` — Next's documented
  way to force an immediate purge from outside a Server Action, where
  `updateTag()` isn't available. Unknown/untracked post types are
  acknowledged as a no-op rather than 400ing, so the WP side doesn't need
  its own allowlist kept in sync.
- New `wp/plugin-headless/includes/class-revalidate.php`: hooks
  `save_post`, scoped to the post types this frontend actually caches
  (`post`, `forum`, `topic`, `reply` — confirmed via `wp post-type list`
  that bbPress forums/topics/replies really are WP posts on this install,
  not custom tables). Everything else this app shows (activity, groups,
  members) isn't stored as a WP post, so `save_post` never fires for it —
  those keep relying on their existing short revalidate windows (30s–300s)
  instead, unchanged.
- Generated a shared secret, set it in `.env.local`, all three Vercel
  environments (via `vercel env add`, run directly — user opted for this
  over doing it manually via the dashboard), and the matching
  `headless_revalidate_secret`/`headless_frontend_url` WP options (the
  latter pointing at the stable `buddyboss.vercel.app` alias, not an
  ephemeral per-deployment URL).
- **Real bug caught by live verification, not assumed correct from
  reading the code:** the first version used `wp_remote_post(...,
  ['blocking' => false])`, on the theory that a save hook must never add
  latency. Triggering it for real (`wp post update` via WP-CLI) showed no
  evidence the request ever completed — checked directly by grepping the
  live blog page's rendered content for a changed title, not just
  trusting a 200 status from WP. The identical call with `blocking =>
  true` landed every time. Switched to blocking (5s timeout) — full
  writeup and reasoning in DECISIONS.md, including why "obviously fire-
  and-forget is correct" was the wrong instinct here.
- Verified end-to-end for real: changed a live post's title via WP-CLI,
  confirmed the new title appeared on `buddyboss.vercel.app/blog`
  immediately after (not after the normal 1-hour blog revalidate window),
  then reverted it. Measured cost: **~4.6s added to a tracked-post-type
  save** (`time wp post update`) — a real, bounded tradeoff, documented
  as a deliberate choice.
- `pnpm verify`, `pnpm build`, and the plugin's PHPUnit suite (17 tests)
  all pass; `./scripts/push-plugin --go` deployed twice (once for the
  initial version, once for the blocking-mode fix) after showing the user
  each dry run first.
- **This closes out Phase 6 — every phase in `PLAN.md` is now complete.**
- **What to look at:** nothing new to look at in the UI. If you ever edit
  a blog post or a forum topic/reply directly in wp-admin, the save
  itself will take a few seconds longer than before (~5s worst case) —
  that's this webhook firing, not a regression.

### 2026-08-28 — Phase 6: Rate limiting on the login route

- New `apps/web/lib/rate-limit.ts` — in-memory, per-instance rate
  limiting (chosen over an external store like Upstash/Vercel KV for now;
  see DECISIONS.md for the tradeoff). Per-IP (not per-username, since a
  brute-force attempt guesses many usernames from one source): after 5
  failed attempts, further attempts from that IP are blocked for 10
  minutes, checked *before* calling WordPress at all so a blocked request
  never even reaches it. A successful login clears the count for that IP.
  5 unit tests (`rate-limit.test.ts`) covering under/at threshold,
  clearing on success, independent keys, and window expiry (via
  `vi.useFakeTimers`).
- Wired into `loginAction` (`auth-actions.ts`) only — not the token
  refresh flow in `proxy.ts`. Refresh tokens are long random secrets bound
  to an existing session cookie, not guessable via credential brute-force
  the way a login password is, so rate limiting it doesn't address the
  same threat and was out of scope for this pass.
- Verified live: 5 wrong-password submissions via Playwright MCP each
  showed the normal generic "Incorrect username or password." error and
  counted toward the limit; the 6th attempt — using the *correct*
  password — was still blocked with "Too many attempts. Try again in 9
  minutes.", confirming the check runs before any call to WordPress. This
  temporarily locked out real login for `headless-test` on the dev
  server for ~10 minutes (expected — it's an in-memory bucket, clears on
  its own; didn't restart the dev server to avoid disrupting other state).
- `pnpm verify` and `pnpm build` pass; `/login` stays statically rendered
  in the build output (the rate limiter only runs inside the Server
  Action, not during page render).
- **What to look at:** nothing new to look at visually under normal use —
  only surfaces after 5 wrong-password attempts in a row from the same
  IP within 10 minutes, which normal usage won't hit.

### 2026-08-28 — Phase 6: Lighthouse pass — found and fixed two real bugs

- Ran Lighthouse (via `npx lighthouse`, headless Chrome) against every
  main page — `/`, `/members`, `/groups`, `/forums`, `/blog`, `/login` —
  on both the deployed production URL and a local `next start` build.
  Baseline on `/`: performance 95, accessibility 96, best-practices 96,
  seo 100.
- **Real bug #1 — hydration mismatch on every homepage load in
  production:** Lighthouse's console-errors audit caught `Minified React
  error #418` (a hydration mismatch) firing on `buddyboss.vercel.app/`
  every single load — confirmed live via Playwright against production,
  reproducible every time. Root cause: five client components
  (`activity-feed-list.tsx`, `activity-comments.tsx`,
  `messages/threads-list.tsx`, `messages/[id]/messages-thread.tsx`,
  `notifications/notifications-list.tsx`) call `timeAgo()`, which defaults
  to `Date.now()`, directly in their render output. Since these components
  render once during SSR (at request time, on the server) and again during
  hydration (at script-execution time, in the browser — measurably later,
  especially under network/CPU throttling), the two `Date.now()` calls can
  legitimately produce different relative-time strings, which React
  reports as a hard hydration error in production (dev mode never showed
  this — it only prints minified digests in prod builds, and this
  session's testing had been exclusively against `next dev` all along, so
  this had been silently happening on every real production page load
  without ever surfacing). Fixed by isolating each `timeAgo()` call in its
  own element with `suppressHydrationWarning` — React's own documented
  pattern for exactly this "value is expected to legitimately differ
  between server and client" case (a clock/timestamp).
- **Real bug #2 — systemic WCAG AA contrast failure in both themes:** the
  `text-black/40 dark:text-white/40` utility pair (used for every
  timestamp, comment/like button, and card meta line — 15 occurrences
  across the app) computes to a 3.77:1 contrast ratio in dark mode against
  this app's near-black background, below the required 4.5:1 for normal
  text. Computed the fix precisely (not by guessing): dark mode needs
  ≥0.45 opacity, light mode actually needs *more* (≥0.55) to hit the same
  ratio against a white background at the same nominal opacity value —
  bumped every non-placeholder occurrence to `/60`, which clears 4.5:1
  with comfortable margin in both themes (6.26:1 dark, 4.76:1 light) and
  matches an opacity step already used elsewhere in the app for secondary
  text. Placeholder text (`placeholder:text-black/40`, 7 occurrences)
  deliberately left alone — Lighthouse's contrast audit doesn't flag
  placeholders, and CLAUDE.md's own convention treats them as visually
  lighter by design.
- Verified both fixes together: re-ran Lighthouse against the fixed local
  production build — accessibility 96→100, best-practices 96→100, zero
  console errors, contrast audit passes with zero violations. All five
  other main pages (already on the fixed build) scored 100/100/100 on
  accessibility/best-practices/seo; `/blog`'s 90 performance score is
  generic Next.js bundle/LCP overhead (legacy JS shims, render-blocking
  font/CSS), not a specific bug — still Lighthouse's "good" band, left
  as-is for this pass.
- `pnpm verify` and `pnpm build` pass; re-verified login/logout still work
  correctly on both localhost and production after the change (touched
  render output only, not session logic, but worth confirming given how
  close this sat to the cookie-flags work from earlier in this session).
- **What to look at:** nothing visually different except slightly darker
  timestamp/meta text — the real fix here is invisible (no more console
  error on page load). Worth opening devtools on `buddyboss.vercel.app/`
  once to confirm the console is clean.

### 2026-08-28 — Phase 6: Cookie-flags-per-environment review

- Audited every cookie set by the app (`hl_access`, `hl_refresh`,
  `hl_user`) for correct `secure`/`sameSite`/`httpOnly` per environment.
  Verdict: already correct — `secure` is conditional on `NODE_ENV ===
  "production"` (so plain-HTTP local dev still works; a browser silently
  drops a `Secure` cookie set over HTTP, which would otherwise break login
  in dev), and this session alone has dozens of successful dev-mode
  logins as empirical proof (`hl_user` is non-httpOnly and its value is
  what `<AuthStatus>` reads via `document.cookie` — if `secure` were
  wrongly `true` in dev, none of those logins would have shown a logged-in
  header). `sameSite: "lax"` is the right default for this BFF shape (the
  browser is same-origin with Next.js, cookies never go directly to
  WordPress) — protects against CSRF on cross-site POSTs while still
  working for normal top-level navigation.
- **The one real finding:** `lib/session.ts` (Server Components/Actions,
  via `next/headers`) and `proxy.ts` (Edge middleware, via
  `NextRequest`/`NextResponse`'s own cookie API — a different runtime that
  can't share the same `cookies()` import) had independently duplicated
  the exact same cookie-name constants and attribute objects. Not
  currently wrong in either copy, but a real drift risk for
  security-relevant flags — nothing would have caught the two silently
  diverging if one were edited without the other.
- Extracted both into a new `lib/session-cookies.ts` (pure, no
  `next/headers` dependency, so it's safe to import from either runtime)
  — cookie names, TTLs, and `accessTokenCookieOptions`/
  `refreshTokenCookieOptions`/`userCookieOptions`/`expiredCookieOptions`
  helpers. Both `session.ts` and `proxy.ts` now call the same functions
  instead of maintaining their own copies.
- Caught a good example of why the "verify live, not just visually" habit
  matters here: the refactor initially looked like it broke login — a
  fresh `pnpm verify` run showed 4 failing auth e2e tests right after the
  change. Investigated rather than assuming the refactor was fine: reran
  the same tests in isolation (3 of 4 passed clean) and manually logged
  out/in via Playwright MCP against the live dev server (worked
  correctly) — the one real failure was a pre-existing, unrelated test
  fragility (a `getByText("Headless Test Account")` locator not scoped to
  the header dropdown, ambiguously matching real, changing activity-feed
  content). Confirmed via three separate clean 25/25 runs afterward that
  it was flakiness, not a regression.
- `pnpm verify` and `pnpm build` pass.
- **What to look at:** nothing new user-facing — same login/logout
  behavior as before, just de-duplicated under the hood. Worth a
  once-over that login/logout still work normally, since this touched the
  session-cookie code path directly.

### 2026-08-28 — Phase 6: Error boundaries, real 404/500 pages — found and fixed a real bug

- Added `app/not-found.tsx` (branded, renders inside the root layout —
  header/footer still show) and `app/global-error.tsx` (catches an error
  thrown by the root layout itself, the one place a normal `error.tsx`
  can't reach — renders its own minimal `<html>/<body>`, no dependency on
  anything that could itself be broken). Filled in the four route
  segments that got skipped when they were built (`messages/`,
  `messages/[id]/`, `messages/new/`, `notifications/` all had no
  `error.tsx`/`loading.tsx` of their own, silently falling through to the
  root's, whose copy says "Couldn't load the activity feed" regardless of
  which page actually failed).
- **Real bug found while doing this, not assumed:** every detail page's
  `if (!thing.id) notFound()` check (members, groups, forums, topics,
  message threads, the new-message compose page) was **dead code**.
  Checked live via curl: `GET /members/{id}`, `/groups/{id}`,
  `/forums/{id}`, `/topics/{id}` all genuinely 404 for a nonexistent id
  (not the 200-with-empty-body pattern several of these pages' own
  comments assumed — true for the blog's `wp/v2/posts?slug=`, never
  actually confirmed for these), and `GET /messages/{id}` 403s for a
  thread you're not a participant in. Either way, `wpFetchJson` throws a
  `WpApiError` before the schema-checked `!thing.id` branch is ever
  reached — so a genuinely-missing member/group/forum/topic/thread was
  always hitting the route's generic `error.tsx` ("Couldn't load this
  member", a "Try again" button that would never help) instead of a real
  404 page.
- Fixed with a new shared `apps/web/lib/fetch-or-not-found.ts`
  (`fetchOrNotFound`) — wraps the single-item fetch, calls `notFound()`
  when the thrown `WpApiError`'s status matches (404 by default; messages
  passes `[403, 404]` since an inaccessible thread should look identical
  to a nonexistent one to the viewer, not leak which case it is). Applied
  at all six call sites; corrected each page's now-inaccurate comment.
- Verified live via Playwright MCP: `/members/999999`, `/groups/999999`,
  and `/messages/999999` all now render the real branded not-found page
  (confirmed via snapshot, not just visually) instead of the generic error
  boundary; an actually-unmatched route (`/this-route-does-not-exist`)
  renders the same page with a real 404 HTTP status.
- `pnpm verify` and `pnpm build` pass; `/_not-found` shows as a real
  prerendered route in the build output.
- **What to look at:** visit any detail page with a made-up id (e.g.
  `/members/999999`) — should show a branded "Page not found", not a red
  "Couldn't load..." error box.

### 2026-08-28 — Phase 6: Caching audit — no bugs found

- Read-only audit per `PLAN.md`'s Phase 6 item ("confirm nothing
  user-specific is cached"), no code changes. Went through every
  `packages/api-client/src/*.ts` module's `cache`/`next.revalidate`
  directives, every page's `getAccessToken()` usage, `proxy.ts`, and
  `next.config.ts` for anything that could serve one user's authenticated
  data to another from a shared cache.
- **Clean result:** every function that accepts `accessToken` sets
  `cache: "no-store"` when it's present, consistently, across activity,
  members, groups, forums, messages, notifications, friends, and media.
  Every page that needs per-user data (`/`, `/groups/[id]`,
  `/members/[id]`, `/forums/[id]`, `/forums/[id]/topics/[topicId]`,
  `/messages*`, `/notifications`) calls `getAccessToken()`/`cookies()` and
  is correctly server-rendered dynamically (confirmed in `pnpm build`'s
  route table — all `ƒ`, not `○`). No page-level `revalidate`/`dynamic`
  export anywhere overrides a per-fetch cache directive. `proxy.ts` sets no
  cache-control headers that could make a CDN cache an authenticated
  response.
- **Two latent-but-inert findings, documented rather than "fixed"** (no UI
  reads them where they'd matter, confirmed by grep, not assumption — see
  DECISIONS.md for the full reasoning): `groupSchema` carries per-user
  `is_member`/`can_join`/`request_id` even in the `/groups` directory's
  anonymous ISR-cached list response, and `activitySchema` carries
  per-user `favorited` in the (also anonymous-cached) comment-thread
  response — worth remembering if either screen ever grows a join/like
  button of its own, since today neither reads those fields at all.
- **What to look at:** nothing — no UI changed. This was a code-reading
  pass, not a feature.

### 2026-08-28 — Phase 5: Notifications — done, Phase 5 complete

- New `packages/types/src/notification.ts` and `packages/api-client/src/
  notifications.ts` (`getNotifications`, `getUnreadNotificationCount`,
  `markNotificationRead`). `/notifications` (infinite-scroll list —
  `NotificationsList`) plus a header nav badge (`NotificationsNavLink`,
  polling every 60s via `useQuery({ refetchInterval })` — Phase 5 scope is
  "polling first, real-time only if it proves necessary" per `PLAN.md`).
- The list endpoint's `is_new` filter has no "all" mode — `true` (default)
  is unread-only, `false` is read-only, confirmed live. The unread badge
  reuses the same call with `per_page=1`, reading `X-WP-Total` — no
  separate count endpoint exists.
- `docs/routes.txt` lists a bulk `/notifications/bulk/read` route that
  **404s live** — there is no mark-all-read endpoint. Each notification is
  marked read individually via `PATCH /notifications/{id}` with
  `{is_new: 0}`; re-marking an already-read one 500s
  (`bp_rest_user_cannot_update_notification_status`) — treated as a no-op,
  not surfaced as an error.
- Security-relevant fix caught before shipping, not after: a
  notification's `description.rendered` is HTML with an `<a href>` already
  pointing at the raw WordPress host (`link_url`) baked in — rendering it
  with `dangerouslySetInnerHTML` (the pattern used for message/activity
  content) would have leaked a link straight to WordPress, breaking this
  project's core BFF rule. Added `stripTags()` to `lib/format.ts` instead —
  notifications render as plain text, no link.
- Verified live via Playwright MCP: sent a real friend request from
  `headless-test-2` → `headless-test` via curl to generate a real
  notification (messages don't generate one on this install — confirmed
  during research, not assumed), confirmed it rendered correctly
  (avatar, plain-text description, no leaked HTML/links) alongside the
  account's one pre-existing real notification, badge showed "2". Clicked
  "Mark as read" — notification disappeared from the list and the badge
  dropped to "1", no reload. Test notification row and friendship row
  deleted directly from the DB afterward (`wp db query DELETE ...` — the
  REST `DELETE /friends/{id}` path wasn't used since the notification row
  needed direct cleanup anyway once already marked read).
- `pnpm verify` and `pnpm build` pass (25/25 e2e including the two flakes
  from last session, both stable this run — confirmed pre-existing
  flakiness, not a regression).
- **This closes out Phase 5.** Messages and notifications both work
  end to end. Phase 6 (production hardening) is next, not started.
- **What to look at:** `/notifications` while logged in — the header badge
  count and the "Mark as read" button on each item. Not covered by this
  slice: a "read" tab (only unread notifications are listed; the API
  supports fetching read ones too if that's wanted later), mark-all-read
  (no endpoint exists for it), and any deep-linking from a notification
  into the specific thing it's about (kept intentionally plain-text/inert
  for now — see the BFF-link gotcha above).

### 2026-08-28 — Phase 5: Messages (thread list, single thread, send/reply)

- New `packages/types/src/message.ts` (thread/message zod schemas — a
  thread response embeds its own `messages[]`, there's no separate
  per-message endpoint) and `packages/api-client/src/messages.ts`
  (`getThreads`, `getThread`, `findThreadWithRecipient`, `sendNewThread`,
  `replyToThread`, `markThreadRead`).
- New routes: `/messages` (inbox, infinite scroll — `ThreadsList`), 
  `/messages/[id]` (thread view — `MessagesThread` + `ReplyComposer`), 
  `/messages/new?to={id}` (first-message compose page). `MessageButton` on
  a member's profile calls `findThreadWithRecipient` first and routes into
  the existing thread if one exists, else to the compose page — see
  DECISIONS.md for why (BuddyBoss doesn't dedup threads on send). Added a
  "Messages" nav link, shown only when logged in
  (`messages-nav-link.tsx`, same client-side session-cookie pattern as
  `<AuthStatus>`).
- `unread_count` drives a bold name + blue dot in the inbox list;
  `markThreadRead` fires server-side in `messages/[id]/page.tsx` whenever a
  thread is opened with `unread_count > 0` (best-effort, doesn't block
  rendering on failure). Counter-intuitive API behavior here — see
  DECISIONS.md before touching this code.
- Created a second dedicated test account (`headless-test-2`, user ID 27,
  subscriber role) via wp-cli — messages, like friend-request
  accept/decline, need two real accounts to verify both directions.
  Credentials in `apps/web/.env.local` only (`TEST_USER2_LOGIN`/
  `TEST_USER2_PASSWORD`), same local-only pattern as the first test
  account.
- Verified live end-to-end via Playwright MCP switching between both real
  accounts: `headless-test` → `headless-test-2`'s profile → Message →
  routed to compose (no existing thread) → sent → redirected into the new
  thread. Logged in as `headless-test-2`: inbox showed the thread bold with
  an unread dot, opened it, replied — both messages rendered correctly
  (own message right-aligned/dark, other's left-aligned/light), no reload
  needed. Logged back in as `headless-test`: reply now showed as the
  inbox excerpt, unread indicator present, opening the thread cleared it.
  Test thread deleted afterward (`wp eval 'messages_delete_thread(id);'`).
- Along the way, found and cleaned up 5 orphaned `bp_activity` rows left
  over from earlier forum-feature test cleanup (`wp post delete` doesn't
  cascade-delete the activity-stream entry bbPress creates alongside a
  topic/reply) — see DECISIONS.md, this is a general test-cleanup gotcha,
  not specific to messages.
- `pnpm verify` and `pnpm build` pass (two unrelated pre-existing e2e
  flakes — `blog.spec.ts`/`forums.spec.ts` click-navigation timing — both
  confirmed to pass individually in isolation, not a regression from this
  work).
- **What to look at:** any other member's profile → "Message" button →
  send → check the other test account's `/messages` inbox for the unread
  badge, then confirm it clears on open. Not covered by this slice: group
  message threads, starred/sentbox views, message attachments,
  notifications (next).

### 2026-08-28 — Phase 4: forum topics/replies — done, Phase 4 complete

- New `TopicComposer` (forum page) and `ReplyComposer` (topic page).
  Posting a topic navigates to the new topic's page (`router.push`, not an
  in-place reset like the reply/comment composers — a new topic is a new
  page, not a list item). `createTopic`/`createReply` in
  `packages/api-client/src/forums.ts`, backed by new
  `apps/web/app/topic-action.ts`/`reply-action.ts`.
- Confirmed live, matching this project's established "don't trust doc
  comments" pattern: topic-create's forum-id param is `parent` (same name
  GET uses to filter), but reply-create's topic-id param is `topic_id`
  (GET's equivalent filter is `parent` — different name for the same
  concept between the two endpoints).
- Real bug caught by testing in the browser, not by the test suite:
  posting a reply worked on WordPress, but the topic page's own refetch
  right after still showed "No replies yet." — `revalidateTag(tag, "max")`
  is stale-while-revalidate, not an immediate purge, and forums reads had
  no authenticated no-store variant the way activity/groups/members did
  (which is what made the same `"max"` choice harmless everywhere else).
  Fixed by giving `getTopics`/`getReplies` the same optional-`accessToken`
  → `no-store` pattern already used elsewhere. Full writeup in
  DECISIONS.md — reread it before adding another `revalidateTag` call
  anywhere in this codebase.
- Verified live via Playwright MCP: created a topic (navigated to it
  correctly), posted a reply (showed up immediately after the fix — did
  not before), reloaded and confirmed persistence. Test topic/replies
  deleted from the live site afterward (had to use `wp post delete`
  directly — the test account's token got 403'd trying to delete via the
  REST API, worth knowing if a "delete my own test post" cleanup step is
  ever needed again).
- `pnpm verify` and `pnpm build` pass.
- **What to look at:** any forum page — post a topic, then open it and
  post a reply. Both should appear without a manual reload.
- **This closes out Phase 4.** Everyday authenticated actions (post,
  comment, like, join/leave groups, friends, forum topics/replies) all
  work end to end. Phase 5 (messages, notifications) is next, not started.

### 2026-08-28 — Phase 4: friend request/accept/decline/cancel/remove

- New `apps/web/app/members/[id]/friendship-button.tsx` on the member
  profile page — branches on `member.friendship_status` (`not_friends` →
  "Add friend", `pending` → "Cancel request", `awaiting_response` →
  "Accept"/"Decline", `is_friend` → "Remove friend"). Hidden on your own
  profile and when logged out.
- `packages/api-client/src/friends.ts` (new): send/accept/decline-or-cancel/
  remove, backed by `apps/web/app/friendship-action.ts`. Same non-optimistic
  `router.refresh()`-after-resolve pattern as the group membership button.
- `memberDetailSchema` gained `friendship_status`/`friendship_id`/
  `create_friendship`. Checked whether `GET /members/{id}` has the same
  single-item-vs-list divergence bug just found in the groups endpoint —
  it doesn't (confirmed live, both return the same values for the same
  request), so `getMember` just takes an optional `accessToken` directly,
  no workaround needed.
- A research pass flagged what looked like a real permission gap in
  BuddyBoss's accept/decline endpoints (only checks login status, not
  identity). Live-tested the accept path directly — it turned out to be
  wrong; the underlying function does its own identity check and 404s for
  a non-recipient. Full writeup in DECISIONS.md, including what's still
  actually unconfirmed (decline-as-third-party) — don't assume either way
  without a second real account to test with.
- Verified live via Playwright MCP: sent a request (button → "Cancel
  request"), cancelled it (button reverts to "Add friend"), confirmed no
  button renders on your own profile. Didn't verify accept/decline in the
  browser — needs a second real account to receive a request, which this
  session doesn't have; verified that path via curl instead (see
  DECISIONS.md). Worth a manual check with two real accounts when
  convenient.
- `pnpm verify` and `pnpm build` pass.
- **What to look at:** any other member's profile page while logged in —
  "Add friend" should appear and the full cycle (send → cancel, or send →
  [someone else accepts] → "Remove friend") should work.

### 2026-08-28 — Fix: public groups showed no Join button

- User reported a public group showing neither "Join" nor "Leave" — the
  membership button was silently absent. Root cause: `GET
  /buddyboss/v1/groups/{id}` has a live WordPress-side bug where
  `is_member`/`can_join`/`request_id` resolve as if the request were
  anonymous, even with a valid access token — confirmed by comparing
  against `GET /groups?include={id}`, which correctly resolves the same
  fields for the same request. Full verification trail (ruled out caching,
  ruled out a bad token, ruled out the `wp eval` red herring) is in
  DECISIONS.md.
- Fix: `getGroup()` now reads the collection endpoint (filtered to one
  group) instead of the single-item endpoint whenever it's called with an
  access token. Anonymous reads are unaffected.
- Verified live via Playwright MCP against three real states: a public
  group not joined (now correctly shows "Join group"), the same account's
  actual group membership (now correctly shows "Leave group" — this had
  been silently wrong too, not just hidden), and a private group (still
  correctly shows "Request to join").
- `pnpm verify` and `pnpm build` pass; deployed and re-aliased.

### 2026-08-28 — Phase 4: join/leave groups

- Public groups: `POST /buddyboss/v1/groups/{id}/members` to join, `DELETE
  .../members/{user_id}` to leave. Private groups need a different flow —
  the join endpoint 500s outright on a private group (confirmed live, not
  from doc comments) — so private groups use `POST
  /buddyboss/v1/groups/membership-requests` (request) and `DELETE
  .../membership-requests/{request_id}` (cancel) instead. All four in
  `packages/api-client/src/groups.ts`, wired up in the new
  `apps/web/app/group-membership-action.ts` and
  `apps/web/app/groups/[id]/group-membership-button.tsx`.
- `groupSchema` gained `is_member`/`can_join`/`request_id` — per-user
  fields, so `getGroup` now takes an optional `accessToken` and the detail
  page (`groups/[id]/page.tsx`) reads it uncached (`no-store`) when logged
  in, same pattern as the activity feed. `request_id`/`invite_id` come back
  as the boolean `false` (not `0`) when unset — confirmed live, handled by
  reusing `looseNumber`'s existing coercion rather than a new special case.
- Added `getSessionUser()` to `lib/session.ts` (reads the same non-httpOnly
  `hl_user` cookie `<AuthStatus>` already reads client-side) — needed
  because leaving a group requires the current user's own ID in the URL
  path, not just the access token.
- Same non-optimistic discipline as the like button: the membership button
  calls its action and only calls `router.refresh()` after it resolves.
  `router.refresh()` (not a query-cache invalidation) is the right tool
  here specifically because this page has no client-side query cache to
  fight — it's plain server-rendered props.
- Hit a confusing one chasing an unrelated failing test: Next.js 16 moved
  the dev server's fetch cache to `.next/dev/cache` (not `.next/cache`,
  which is what every existing habit and most docs still say) — spent a
  while convinced a bug was live-API-side because clearing the *old* path
  did nothing. Worth remembering next time a dev-only cache seems stuck.
- Verified live via Playwright MCP against a real public group (join →
  member count +1 → leave → count reverts) and a real private group
  (request → button becomes "Cancel request" → cancel → reverts).
- One real side effect from this session's *manual* API testing (not from
  the shipped code): my curl testing had temporarily emptied a real
  group's member list on the live site, which is what actually broke the
  pre-existing groups e2e test — fixed by rejoining that group, not by
  changing code. Worth a reminder: manual curl testing against the live
  site during development is real state, not a sandbox — clean up test
  actions before assuming a subsequent test failure is a code bug.
- `pnpm verify` and `pnpm build` pass.
- **What to look at:** any group page while logged in — a public group
  should show "Join group"/"Leave group", a private one "Request to
  join"/"Cancel request".

### 2026-08-28 — Phase 4: like/unlike an activity post

- `PATCH /buddyboss/v1/activity/{id}/favorite` is a pure toggle (no body —
  server decides add-vs-remove from current state, confirmed live), so
  `toggleActivityFavorite` (`packages/api-client/src/activity.ts`) and
  `toggleFavoriteAction` (new, `apps/web/app/favorite-action.ts`) are both
  small. Reused `activitySchema` for the response since it's the full
  updated activity.
- `activity-feed-list.tsx`'s old `LikesButton` (read-only count + "who
  liked" popover) became `LikesRow`: a thumb-icon toggle button (filled
  blue when `activity.favorited`) sits next to the existing count/popover,
  which is unchanged. Only enabled when logged in.
- Deliberately not optimistic: the toggle button calls the action and waits
  for the result before invalidating the feed query, same discipline as
  `favorite-action.ts` documents — this codebase already paid for an
  optimistic-update bug once (see the logout fix in git history) and isn't
  paying for it twice.
- Verified live via Playwright MCP: toggled a real post's like on and off
  (count and icon updated correctly both times), and confirmed the
  existing "who liked" popover still opens correctly on a post with a real
  like from another account.
- `pnpm verify` and `pnpm build` pass.
- **What to look at:** the thumb icon next to any post's like count — click
  to like/unlike, click the count text itself to see who liked it.

### 2026-08-28 — Phase 4: comment on activity posts

- `apps/web/app/comment-action.ts` (new) + `activity-comments.tsx` gained a
  reply form. Top-level comments only — no `parent_id` yet, see
  DECISIONS.md. `createActivityComment` in `packages/api-client/src/
  activity.ts`.
- Every activity's "N comments" is now a clickable button, even at 0 — so a
  logged-in user can open an empty thread and post the first comment.
  Previously only `comment_count > 0` items were clickable.
- That change surfaced a real, pre-existing bug: `GET .../comment` returns
  a bare `[]` (not `{comment_count, comments}`) when there are zero
  comments — the schema had no top-level `.catch()`, so it threw an
  uncaught `ZodError`, which then hit a *second* Next-16-dev-mode crash
  trying to process it ("Cannot set property message of [object Object]
  which has only a getter"), manifesting as a permanently-stuck "Loading
  comments…". Fixed the schema, added a regression test. Caught this by
  diffing a passing vs. failing `pnpm verify` run against a git stash of
  the new code — the e2e suite's own flakiness (see below) initially made
  it look like environmental noise.
- Extracted the session-cookie-reading hook from `auth-status.tsx` into a
  shared `apps/web/lib/use-session-user.ts` (`useSessionUser`) — the
  comment composer needed the same "is anyone logged in" check
  `<AuthStatus>` already had, done client-side for the same ISR reason.
- `pnpm verify` and `pnpm build` pass; the e2e suite's `ECONNRESET`
  flakiness against the remote WP host (see the crash-investigation entry
  below) surfaced two more transient test failures this session, both
  confirmed unrelated by rerunning in isolation.
- Verified live via Playwright MCP: two comments posted back-to-back in the
  same mount both showed up immediately (same "depend on `state`, not
  `state.success`" pattern as the post composer). Test comments deleted
  from the live site afterward.
- **What to look at:** open any activity's comment count (including "0
  comments") and post one — should show up immediately, no reload needed.

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
