import type { TFunction } from "i18next";

// creator is null once the author deleted their account, the post itself stays
export function forumAuthorName(
  creator: { fullName: string | null } | null,
  t: TFunction,
): string {
  if (!creator) return t("common.deletedUser");
  return creator.fullName ?? t("common.unknown");
}
