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
