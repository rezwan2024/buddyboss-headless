# PLAN.md

Phased build plan. Each phase ends with something visible and verified. Do not
start a phase before the previous one is done.

Companion files: `CLAUDE.md` (rules and conventions), `PROGRESS.md` (where we
actually are), `DECISIONS.md` (why things are the way they are). This file is
what *will* be built — it changes rarely. Don't mark tasks done here; that goes
in `PROGRESS.md`.

Public reads come before auth, because the BuddyBoss API allows anonymous access.
That means real screens exist early instead of spending the first sessions on
token plumbing with nothing to look at.

**Deployment happens from day one.** Vercel is wired up in Phase 1, before any
features exist, and every push to `main` deploys automatically after that. There
is no separate "deployment phase" — the app is always live. This surfaces
environment bugs (hardcoded URLs, image domains, cookie flags) while there are ten
files instead of two hundred.

---

## Phase 0 — Harness

**Goal:** the environment is reproducible and the API surface is known.

- [x] SSH key auth to the remote site
- [x] `./scripts/wp` — WP-CLI over SSH
- [x] `./scripts/pull` — mirror WordPress root to `./remote/`
- [x] `./scripts/push` — dry-run-by-default deploy
- [x] `docs/routes.txt` — 153 live routes
- [x] `CLAUDE.md`
- [ ] `scripts/introspect-api.ts` — sample response per route into `docs/samples/`

**Done when:** a sample JSON response exists on disk for every route the project
will use, so data shapes are ground truth rather than guesses.

---

## Phase 1 — Scaffold

**Goal:** a Next.js app that can fetch from BuddyBoss, plus a working feedback loop.

- Next.js App Router, TypeScript strict, Tailwind, Biome
- `lib/wp-fetch.ts` — the single transport (no auth yet)
- `packages/api-client` — first module, one endpoint
- Type generation from the Phase 0 samples
- One page rendering real data from the live site
- `pnpm verify` script: typecheck + lint + unit tests + smoke E2E
- **Playwright MCP configured** in `.mcp.json`, pointed at `localhost:3000`
- **GitHub repo + Vercel project connected**, auto-deploy on push to `main`
- `WP_URL` set as an env var in Vercel — no hardcoded hostnames anywhere
- `next.config.js` image `remotePatterns` driven by env (media may be CDN-offloaded)

**Done when:** `pnpm dev` shows real BuddyBoss data at localhost:3000, `pnpm verify`
passes, Claude Code can open the page in a browser and read its console, **and the
same page is live on a Vercel URL.**

The Playwright MCP matters more than it looks. Without it, the user is the feedback
loop — they run the page, spot the bug, report it. With it, Claude Code checks its
own work and fixes what it finds. Set it up before building features, not after.

---

## Phase 2 — Public reads

**Goal:** the anonymous-visible parts of the community, working.

- Blog: list + single post (`wp/v2/posts`)
- Members: directory with pagination and search
- Profile: single member, xProfile fields, avatar, cover
- Activity: global feed, single activity
- Groups: directory, single group, member list
- Forums: forum list, topics, replies

All read-only. No login.

Each feature ships to Vercel as it lands. Check the deployed URL, not just
localhost — server-side rendering behaves differently in production, and the live
build is what colleagues will see.

**Done when:** you can browse the whole public community without authenticating,
pagination works on every list, and the Vercel URL is shareable.

---

## Phase 3 — Auth

**Goal:** login works end to end.

- JWT plugin in `wp/plugin-headless/`: issue, verify, refresh, revoke
- `determine_current_user` wired at the right priority — must run before REST
  permission callbacks, or BuddyBoss computes visibility against user 0
- PHPUnit test proving a valid token yields the right `get_current_user_id()`
- Deploy via `./scripts/push`
- Login and logout Server Actions, httpOnly cookies
- Refresh-and-retry in `wp-fetch`
- Protected route middleware

**Done when:** logging in changes what the activity feed shows, and the session
survives an access-token expiry.

---

## Phase 4 — Authenticated actions

**Goal:** the app writes, not just reads.

- Post activity, comment, favorite, delete
- Own profile: view and edit
- Groups: join, leave
- Forums: create topic, reply
- Friends: request, accept, remove

**Done when:** a logged-in user can do the everyday things a member does.

---

## Phase 5 — Messages and notifications

**Goal:** the parts that need auth by nature.

- Message threads: list, single thread, send
- Notifications: list, mark read, unread count
- Polling first. Real-time only if it proves necessary.

**Done when:** two test accounts can hold a conversation.

---

## Phase 6 — Production hardening

**Goal:** the deployment is solid, not just working.

Vercel has been live since Phase 1, so this is not "set up deployment" — it's
tightening what's already there.

- Cookie flags correct per environment (`secure` requires HTTPS, so dev over
  plain HTTP needs it conditional on `NODE_ENV`)
- Caching audit — confirm nothing user-specific is cached, per `CLAUDE.md`
- Error boundaries and a real 404/500 page
- Cache revalidation webhook from WordPress on `save_post`
- Rate limiting on auth routes
- Lighthouse pass on the main pages

**Done when:** you'd be comfortable sharing the URL widely rather than just with
a couple of colleagues.

---

## Out of scope for now

Real-time sockets, LearnDash/Tutor LMS integration, gamification, media uploads,
moderation tools, email invites, SEO work.

Revisit only after Phase 6.

---

## What "done" means

Each phase lists its own done condition above. On top of that, every individual
task must meet the **Definition of done for a task** in `CLAUDE.md` — verify
passes, the page renders correctly in a browser, `pnpm build` succeeds, and
`PROGRESS.md` is updated.
