#!/usr/bin/env node
// Prints a rough Zod schema draft inferred from a docs/samples/*.json file, to
// stdout. This is a starting point for src/*.ts, not the final output — review
// and trim it by hand before committing. BuddyBoss responses carry far more
// fields than any one screen needs; keep the checked-in schema to what's used.
//
// Usage: node packages/types/scripts/draft-schema.ts <path-to-sample.json> [--array]

import { readFileSync } from "node:fs";

const [samplePath, ...flags] = process.argv.slice(2);
if (!samplePath) {
  console.error("Usage: node draft-schema.ts <path-to-sample.json> [--array]");
  process.exit(1);
}
const treatAsArray = flags.includes("--array");

function inferZod(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (value === null) return "z.null()";
  if (Array.isArray(value)) {
    if (value.length === 0) return "z.array(z.unknown())";
    return `z.array(${inferZod(value[0], indent)})`;
  }
  switch (typeof value) {
    case "string":
      return "z.string()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "object": {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return "z.object({})";
      const lines = entries.map(
        ([key, val]) => `${pad}  ${JSON.stringify(key)}: ${inferZod(val, indent + 1)},`,
      );
      return `z.object({\n${lines.join("\n")}\n${pad}})`;
    }
    default:
      return "z.unknown()";
  }
}

const raw = JSON.parse(readFileSync(samplePath, "utf8"));
const body = raw.body ?? raw;
const sample = treatAsArray && Array.isArray(body) ? body[0] : body;

console.log(inferZod(sample));
