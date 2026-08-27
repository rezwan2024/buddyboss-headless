// Shared loose-type helpers. BuddyBoss serializes booleans and numbers
// inconsistently (true/false vs 0/1 vs "0"/"1" depending on endpoint and PHP
// code path) — coerce, don't trust. Used across every route's schema.
import { z } from "zod";

// z.coerce.boolean() is a trap here: it does JS-truthy coercion, so the
// string "0" (falsy in PHP, truthy in JS) coerces to `true`. Treat "0"/""
// as false explicitly instead.
export const looseBoolean = z
  .union([z.boolean(), z.string(), z.number()])
  .transform((v) => (typeof v === "string" ? v !== "" && v !== "0" : Boolean(v)))
  .catch(false);

export const looseNumber = z.coerce.number().catch(0);

export const avatarUrlsSchema = z
  .object({
    full: z.string().catch(""),
    thumb: z.string().catch(""),
  })
  .catch({ full: "", thumb: "" });
