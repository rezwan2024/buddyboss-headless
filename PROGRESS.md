# PROGRESS.md

Living state of the project. Claude Code reads this at the start of every session
and updates it at the end. Newest entries at the top.

Keep it short. This is a status file, not a diary. Scope lives in `PLAN.md`,
reasoning in `DECISIONS.md`, rules in `CLAUDE.md`.

---

## Current state

**Phase:** 3 — Auth — done, pending this session's frontend deploy (plugin is
already live). Login works end to end: `/login` → activity feed changes to
the authenticated view → session survives an access-token expiry via
`proxy.ts`'s proactive refresh. See session log below for what was actually
verified against the live site.
**Next task:** Phase 4 — Authenticated actions (post activity, comment,
favorite/like, join/leave groups, forum topics/replies, friends). The like
button and comment composer the user asked for earlier in Phase 2 belong
here now that login exists.

## Blockers

None. One follow-up: the Playwright MCP is configured in `.mcp.json` but this
session hasn't reconnected to MCP servers since — a fresh session (or an
explicit MCP reload) is needed before Claude Code can drive the browser
directly. Until then, the Playwright *test* smoke suite (`pnpm test:e2e`)
covers rendering + console-error checks.

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
