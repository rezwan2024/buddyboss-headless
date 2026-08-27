# PROGRESS.md

Living state of the project. Claude Code reads this at the start of every session
and updates it at the end. Newest entries at the top.

Keep it short. This is a status file, not a diary. Scope lives in `PLAN.md`,
reasoning in `DECISIONS.md`, rules in `CLAUDE.md`.

---

## Current state

**Phase:** 1 — Scaffold — done. Live at https://buddyboss.vercel.app.
**Next task:** Phase 2 — public reads (blog, members, profile, groups, forums;
activity feed already ships from Phase 1). See `PLAN.md` Phase 2.

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

---

## Session log

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
