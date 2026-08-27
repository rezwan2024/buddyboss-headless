# CLAUDE.md

Headless BuddyBoss frontend. Next.js App Router talking to an existing BuddyBoss
WordPress install over its REST API.

## Project goal

Build a headless frontend for a BuddyBoss community site: activity feed, members,
profiles, groups, forums, messages, notifications, and blog. This is a practice
project for agentic development, so favour verifiable slices over big rewrites.

## Architecture

Browser never talks to WordPress. Next.js is a BFF sitting in the middle.

    Browser  ->  Next.js server  ->  WordPress (buddyboss/v1 REST)
    (cookie)     (holds tokens)      (staging site)

Consequences:

- No CORS to configure. Never call WordPress from a Client Component.
- Auth tokens live in httpOnly cookies read server-side. They never reach JS.
- Every WordPress call goes through `lib/wp-fetch.ts`. No exceptions.

## Project files — read these

At the **start** of every session:

1. `PROGRESS.md` — current phase, next task, blockers
2. `PLAN.md` — what this phase covers and what "done" means
3. `DECISIONS.md` — settled choices. Do not reopen these without being asked.

At the **end** of every session, or after finishing a meaningful chunk of work:

- Update `PROGRESS.md` — current state, blockers, a dated session-log entry
- Append to `DECISIONS.md` if a non-obvious choice was made

Keep the files in their lanes:

- `PLAN.md` — what will be built (stable, edited rarely)
- `PROGRESS.md` — what is built and what's next (changes every session)
- `DECISIONS.md` — why things are the way they are (append-only)
- `CLAUDE.md` — rules and conventions (this file)

Don't duplicate content across them. If a task is done, say so in `PROGRESS.md`
rather than editing `PLAN.md`.

---

## Running and checking the frontend

The dev server runs at `http://localhost:3000`:

    pnpm dev

The user usually keeps this running in a separate terminal with the browser open,
so hot reload shows changes immediately. Don't start a second dev server if one is
already running — check port 3000 first.

Useful commands:

    pnpm dev            # dev server, hot reload
    pnpm build          # production build — catches type and build errors
    pnpm verify         # typecheck + lint + unit tests + smoke E2E
    pnpm verify:full    # everything, including the full E2E suite

`pnpm build` is worth running before calling a phase done. Plenty of App Router
mistakes only surface at build time.

## Verifying your own work

Code that compiles is not the same as code that works. Before reporting a task
complete:

1. `pnpm verify` passes
2. The affected page actually renders — check it, don't assume
3. The data shown matches what the API returns (cross-check with `./scripts/wp`
   or a direct curl if anything looks off)

**Never report success on the basis that the code looks right.** BuddyBoss returns
200 with filtered data instead of erroring, so a page can render perfectly while
showing the wrong thing.

## Playwright MCP

Once configured, the Playwright MCP lets you drive the browser directly — open
pages, click, fill forms, read console errors, take screenshots. Use it.

Use it to:

- Confirm a page renders after building it
- Read console and network errors instead of asking the user what they see
- Walk a flow end to end (login, post activity, join a group)
- Check loading and empty states, not just the happy path

When something doesn't work, look at console output first. Usually faster than
reasoning about the code.

Rules:

- Point it at `localhost:3000`, never at the live site
- Don't run flows that write to the remote site outside the dedicated test user
- Screenshots for layout questions, console output for behaviour questions

Setup lives in `.mcp.json`, committed so the config is reproducible.

## The user checks the frontend too

The user keeps `localhost:3000` open in a browser and reviews work manually as it
lands. That review is part of the loop, not a formality.

What this means:

- **Say what to look at.** After finishing something, name the page or flow worth
  checking, e.g. "members directory at /members — pagination and avatar loading".
  Don't just say "done".
- **Flag anything you couldn't verify.** Layout, spacing, whether a design choice
  reads well, mobile behaviour — Playwright doesn't judge these. Call them out.
- **Take their report as ground truth.** If they say something looks wrong, it is,
  even when tests pass and the console is clean.
- **Don't restart the dev server** without asking. They may have state in the
  browser they're mid-way through checking.

Playwright and manual review cover different things. Playwright catches errors and
regressions; the user catches things that are technically working but wrong.

## Deployment

Vercel is connected from Phase 1. Every push to `main` deploys automatically.
There is no manual deploy step and no separate deployment phase — the app is
always live.

    Local dev   ->  localhost:3000       ->  WP_URL from apps/web/.env.local
    Vercel      ->  <project>.vercel.app ->  WP_URL from Vercel env vars

Both point at the same BuddyBoss backend for now. That's fine — it's a dev site.

Rules:

- **No hardcoded hostnames.** Not in `next.config.js`, not in fetch calls, not in
  image domains. Everything environment-specific is an env var. This is the single
  most common cause of "works locally, breaks on Vercel".
- **Adding an env var means adding it in two places** — `apps/web/.env.local` and the
  Vercel dashboard. Tell the user when they need to add one; you can't set it for
  them.
- **Check the deployed build, not just localhost.** Server Components, caching,
  and image optimization all behave differently in production.
- **`pnpm build` before pushing** anything substantial. It catches what `pnpm dev`
  won't.
- If a deploy fails, read the Vercel build log before changing code.

## Definition of done for a task

- `pnpm verify` passes
- The page renders and shows correct data, confirmed in the browser
- Loading and error states exist
- Types come from the generated package, not hand-written
- The user has been told what to look at, and anything unverifiable is flagged
- `pnpm build` succeeds (so the Vercel deploy won't fail)
- `PROGRESS.md` updated

---

## Decisions already made — do not revisit

Short version. Full reasoning and the complete log live in `DECISIONS.md`.

- **REST, not GraphQL.** WPGraphQL only exposes core WP data (posts, pages, users).
  BuddyBoss data lives in its own tables and has no GraphQL layer. Do not suggest
  WPGraphQL or Faust.js.
- **Use BuddyBoss's shipped REST API.** Do not write custom REST endpoints for
  data that `buddyboss/v1` already serves.
- **The only custom PHP is a JWT auth plugin.** BuddyBoss's API assumes cookie +
  nonce auth, which doesn't work from a separate Next.js server.
- **Blog uses `wp/v2/posts`** (WordPress core), not a BuddyBoss route.

## The remote site

A BuddyBoss-hosted dev site. It is live and shared. All 16 BuddyBoss components
are active. BuddyBoss Platform Pro is installed.

- Frontend URL for API calls comes from `WP_URL` in `apps/web/.env.local`
- Credentials live in `.env.deploy` (gitignored) — never read, print, or commit it
- `docs/routes.txt` lists all 153 registered `buddyboss/v1` routes from this
  actual install. Check it before assuming an endpoint exists.
- `docs/samples/` (sample JSON responses, one per route) is **local-only** —
  gitignored, never committed. Regenerate it with `./scripts/introspect-api.ts`
  whenever you need it. It contains real member names and activity content from
  the live site, and the repo is public.

## Scripts

Always use these. Never bare `wp`, never raw ssh/rsync commands.

    ./scripts/wp <args>          # WP-CLI on the remote site over SSH
    ./scripts/pull               # mirror remote WordPress root into ./remote/
    ./scripts/push <subpath>     # dry-run by default; add --go to apply
    ./scripts/push-plugin        # deploys wp/plugin-headless/ specifically; dry-run by default

Examples:

    ./scripts/wp option get blogname
    ./scripts/wp user list --role=subscriber --field=user_login
    ./scripts/wp bp activity list --count=5
    ./scripts/push wp-content/plugins/headless/          # preview
    ./scripts/push wp-content/plugins/headless/ --go     # apply
    ./scripts/push-plugin                                # preview the auth plugin deploy
    ./scripts/push-plugin --go                            # apply

`./scripts/push-plugin` exists because `./scripts/push` only ever syncs from
the gitignored `./remote/` mirror — the auth plugin's canonical source lives
in git at `wp/plugin-headless/` instead, so it needs its own deploy path
straight from that tracked directory (excludes `tests/`, `vendor/`, and
composer files — dev-only, not deployed).

## Rules for the remote site

- It is a **live shared site** with real data. Be conservative.
- `./scripts/push` and `./scripts/push-plugin` are dry runs without `--go`.
  Show the user the dry-run output and get confirmation before running with
  `--go`.
- Never push to `wp-admin/`, `wp-includes/`, or `wp-config.php`.
- Never run destructive WP-CLI (`db reset`, `site empty`, `post delete --force`,
  `plugin deactivate` on BuddyBoss plugins) without explicit confirmation.
- Test content goes under a dedicated test user, not a real member's account.
- `./remote/` is a read-only mirror for reference. It is gitignored. Editing files
  there does nothing until pushed.
- **The GitHub repo is public.** `./remote/` contains `wp-config.php` with live DB
  credentials and salts, plus licensed BuddyBoss Pro source. `.env.deploy` contains
  server access details. Neither may ever be committed. Check `git status` before
  committing a directory for the first time, and never use `git add -f` on either.

## BuddyBoss API gotchas

These have burned people before. Assume they apply.

- **200 instead of 403.** Permission failures return filtered data, not an error.
  Assert on response content, never on status code alone.
- **Loose types.** Fields come back as `"12"` where you expect `12`, and `false`
  or `""` where you expect `0` or `null`. Use Zod with `z.coerce` and `.catch()`
  at the boundary so components never deal with it.
- **Pagination lives in headers**, not the body: `X-WP-Total` and
  `X-WP-TotalPages`. List functions must return `{ items, total, pages }`.
- **xProfile fields are a separate call.** Profile data does not come inline on
  the member object.
- **Forums are bbPress underneath**, so their data model is post-type shaped, not
  BP-table shaped. Different semantics from activity or groups.
- **Media may be offloaded.** The `buddyboss-offload-media` plugin is active, so
  asset URLs may point at a CDN rather than the WP host. Configure
  `next.config.js` `remotePatterns` from what the API actually returns.
- **Uploads need `multipart/form-data`**, so they bypass the usual JSON path.

## Frontend conventions

- TypeScript strict. pnpm. Tailwind. Biome for lint and format.
- Reads happen in Server Components. Writes happen in Server Actions.
- Client-side lists and infinite scroll use TanStack Query, calling Server Actions.
- Types in `packages/types` are **generated**. Never hand-edit them.
- Zod-parse every WordPress response at the client-module boundary.
- No hardcoded hostnames anywhere. Everything environment-specific is an env var,
  because production points at a different WordPress than dev.

## Caching

- Blog posts: `revalidate: 3600` + tag
- Member directory: `revalidate: 300`
- Activity feed: `revalidate: 30` + tag, purged on post
- **Anything user-specific: `cache: 'no-store'`.** If the request carries an
  Authorization header and the response varies by user, it is not cacheable.
  Serving one user's cached private data to another would be the worst possible
  bug in this project.

## Build order

Phases live in `PLAN.md`. In short: public reads first (the API allows anonymous
access, so real screens exist before auth does), Vercel connected from Phase 1,
auth in Phase 3, messages last.

## Working style

- Small vertical slices: route + data fetch + types + test, one component at a time.
- Verify with real calls against the live API rather than assuming shapes.
- When a response looks wrong, check `docs/routes.txt` and query the real endpoint
  before changing code.
- Don't add dependencies without saying why.
