// Derived from GET /buddyboss/v1/xprofile/groups?fetch_fields=1 — the
// canonical set of profile fields this install has configured, independent
// of any one member's values. Cross-referenced against a member's own
// `xprofile.groups` (see member.ts, which only lists fields that member has
// actually filled in) to compute a "N of M required fields filled"
// completeness count. Trimmed to what that calculation needs — the real
// response also carries field type, options, descriptions, etc.
import { z } from "zod";
import { looseBoolean, looseNumber } from "./shared";

const xprofileFieldDefSchema = z.object({
  id: looseNumber,
  name: z.string().catch(""),
  is_required: looseBoolean,
});

const xprofileGroupDefSchema = z.object({
  id: looseNumber,
  name: z.string().catch(""),
  fields: z.array(xprofileFieldDefSchema).catch([]),
});

export type XProfileGroupDef = z.infer<typeof xprofileGroupDefSchema>;

export const xprofileGroupDefListSchema = z.array(xprofileGroupDefSchema);
