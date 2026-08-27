import type { ForumThreadType } from "@/api/types";

/**
 * Shared className fragments for consistency across the app.
 * Prefer these over ad-hoc utility strings for recurring patterns.
 */

/** Inline text link (e.g. a linked name inside a table cell or detail row). */
export const inlineLink =
  "font-medium text-primary underline underline-offset-2 hover:text-primary/75";

/** Badge colours for a Treffpunkt thread type — used with <Badge variant="outline">. */
export const threadTypeBadgeClass: Record<ForumThreadType, string> = {
  question:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-900",
  feature_request:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900",
  bug_report:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
  general: "bg-muted text-muted-foreground border-transparent",
};
