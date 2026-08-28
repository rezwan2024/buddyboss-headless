import type { MemberDetail, XProfileGroupDef } from "@buddyboss-headless/types";

export interface ProfileCompleteness {
  filled: number;
  total: number;
  percent: number;
  hasPhoto: boolean;
  hasCover: boolean;
}

/**
 * "N of M" completeness, counting only *required* xprofile fields plus
 * avatar/cover — matches what a member can actually be expected to fill
 * in, not every optional field this install happens to have configured.
 * Confirmed live: BuddyBoss omits an unfilled field from a member's own
 * `xprofile.groups` entirely rather than sending it with an empty value,
 * so "filled" here means "the field id appears at all" in that map, not a
 * truthiness check on some placeholder value.
 */
export function computeProfileCompleteness(
  member: MemberDetail,
  fieldDefs: XProfileGroupDef[],
): ProfileCompleteness {
  const filledFieldIds = new Set<number>();
  for (const group of Object.values(member.xprofile.groups)) {
    for (const id of Object.keys(group.fields)) filledFieldIds.add(Number(id));
  }

  const requiredFieldIds = fieldDefs
    .flatMap((group) => group.fields)
    .filter((field) => field.is_required)
    .map((field) => field.id);

  const filledRequired = requiredFieldIds.filter((id) => filledFieldIds.has(id)).length;
  const hasPhoto = !member.avatar_urls.is_default;
  const hasCover = !member.cover_is_default;

  const filled = filledRequired + (hasPhoto ? 1 : 0) + (hasCover ? 1 : 0);
  const total = requiredFieldIds.length + 2;

  return {
    filled,
    total,
    percent: total > 0 ? Math.round((filled / total) * 100) : 0,
    hasPhoto,
    hasCover,
  };
}
