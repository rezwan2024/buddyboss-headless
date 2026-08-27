import { readFileSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Playwright's own process doesn't auto-load .env.local the way `next dev`
// does — needed here for TEST_USER_LOGIN/TEST_USER_PASSWORD (auth.spec.ts).
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
} catch {
  // no .env.local — fine, tests that need it will skip themselves
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  // Reuse a dev server the user already has running (per CLAUDE.md, don't
  // start a second one) — only spins up its own if port 3000 is free.
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
