#!/usr/bin/env node
// Fetches one sample response per route in docs/routes.txt and writes it to
// docs/samples/<slug>.json. GET-only, unauthenticated (no auth exists yet —
// that's Phase 3), so this is safe to re-run against the live site.
//
// Placeholder path params (e.g. (?P<id>\d+)) are filled with real IDs pulled
// from the live site where cheap to know, otherwise "1" — a 404 for a
// placeholder ID is still a useful sample of the error shape.
//
// Usage: node scripts/introspect-api.ts

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

function loadEnvLocal(): void {
  try {
    const content = readFileSync(join(rootDir, ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // no .env.local — fine, WP_URL may already be set in the environment
  }
}

loadEnvLocal();

const WP_URL = process.env.WP_URL;
if (!WP_URL) {
  console.error("WP_URL is not set. Add it to .env.local.");
  process.exit(1);
}

// Sample values for named path params, keyed by param name. Falls back to
// "1" for anything not listed here.
const SAMPLE_VALUES: Record<string, string> = {
  id: "373", // most routes' generic id — activity id 373 exists and is safe to read
  user_id: "3",
  group_id: "5",
  comment_id: "319",
  option_id: "1",
  vote_id: "1",
  request_id: "1",
  invite_id: "1",
  field_id: "1",
  activation_key: "sample-key",
  nav: "general",
  type: "bookmark",
};

// Per-route overrides where the generic "id" value (373, an activity id)
// would be the wrong entity for that route.
const ROUTE_ID_OVERRIDES: Record<string, string> = {
  "/buddyboss/v1/members/(?P<id>[\\d]+)": "3",
  "/buddyboss/v1/members/(?P<id>[\\d]+)/detail": "3",
  "/buddyboss/v1/members/(?P<id>[\\d]+)/info": "3",
  "/buddyboss/v1/members/action/(?P<id>[\\d]+)": "3",
  "/buddyboss/v1/members/(?P<id>\\d+)/awards": "3",
  "/buddyboss/v1/groups/(?P<id>[\\d]+)": "5",
  "/buddyboss/v1/groups/(?P<id>[\\d]+)/detail": "5",
  "/buddyboss/v1/groups/(?P<id>[\\d]+)/info": "5",
  "/buddyboss/v1/groups/(?P<id>[\\d]+)/settings": "5",
  "/buddyboss/v1/forums/(?P<id>[\\d]+)": "702",
  "/buddyboss/v1/forums/subscribe/(?P<id>[\\d]+)": "702",
  "/buddyboss/v1/topics/(?P<id>[\\d]+)": "196",
  "/buddyboss/v1/topics/merge/(?P<id>[\\d]+)": "196",
  "/buddyboss/v1/topics/split/(?P<id>[\\d]+)": "196",
  "/buddyboss/v1/topics/action/(?P<id>[\\d]+)": "196",
  "/buddyboss/v1/topics/dropdown/(?P<id>[\\d]+)": "196",
  "/buddyboss/v1/reply/(?P<id>[\\d]+)": "290",
  "/buddyboss/v1/reply/action/(?P<id>[\\d]+)": "290",
  "/buddyboss/v1/reply/move/(?P<id>[\\d]+)": "290",
  "/buddyboss/v1/xprofile/fields/(?P<id>[\\d]+)": "1",
  "/buddyboss/v1/xprofile/groups/(?P<id>[\\d]+)": "1",
  "/buddyboss/v1/xprofile/repeater/(?P<id>[\\d]+)": "1",
  "/buddyboss/v1/xprofile/repeater/order/(?P<id>[\\d]+)": "1",
  "/buddyboss/v1/notifications/(?P<id>[\\d]+)": "1195",
  "/buddyboss/v1/messages/(?P<id>[\\d]+)": "105",
  "/buddyboss/v1/messages/starred/(?P<id>[\\d]+)": "105",
  "/buddyboss/v1/messages/action/(?P<id>[\\d]+)": "105",
  "/buddyboss/v1/subscriptions/(?P<id>[\\d]+)": "1",
  "/buddyboss/v1/friends/(?P<id>[\\w-]+)": "3",
  "/buddyboss/v1/invites/(?P<id>[\\d]+)": "1",
  "/buddyboss/v1/signup/(?P<id>[\\w-]+)": "1",
};

function resolveRoute(route: string): string {
  const override = ROUTE_ID_OVERRIDES[route];
  return route.replace(/\(\?P<(\w+)>[^)]*\)/g, (_match, name: string) => {
    if (name === "id" && override) return override;
    return SAMPLE_VALUES[name] ?? "1";
  });
}

function slugify(route: string): string {
  return route
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const routesPath = join(rootDir, "docs", "routes.txt");
  const samplesDir = join(rootDir, "docs", "samples");
  mkdirSync(samplesDir, { recursive: true });

  const routes = readFileSync(routesPath, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && l !== "/buddyboss/v1");

  console.log(`Introspecting ${routes.length} routes against ${WP_URL}...`);

  let ok = 0;
  let failed = 0;

  for (const route of routes) {
    const resolvedPath = resolveRoute(route);
    const url = `${WP_URL}/wp-json${resolvedPath}`;
    const slug = slugify(route);
    const outPath = join(samplesDir, `${slug}.json`);

    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      const text = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        body = text.slice(0, 2000); // non-JSON response (e.g. HTML error page)
      }

      const sample = {
        route,
        resolvedPath,
        url,
        status: res.status,
        totalHeader: res.headers.get("x-wp-total"),
        totalPagesHeader: res.headers.get("x-wp-totalpages"),
        body,
      };

      writeFileSync(outPath, JSON.stringify(sample, null, 2));
      console.log(`  ${res.status} ${route}`);
      ok++;
    } catch (err) {
      const sample = {
        route,
        resolvedPath,
        url,
        error: err instanceof Error ? err.message : String(err),
      };
      writeFileSync(outPath, JSON.stringify(sample, null, 2));
      console.log(`  ERR ${route} — ${sample.error}`);
      failed++;
    }

    // Be polite to a live shared site.
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`Done. ${ok} fetched, ${failed} errored. Samples in docs/samples/`);
}

main();
