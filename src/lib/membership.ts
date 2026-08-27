import type { components } from "@/api/schema";

type UserMembershipStatus =
  components["schemas"]["GetV1MembershipStatusPositiveResponse"]["data"];

export const GRACE_PERIOD_DAYS = 10;

// True if the user's own paid membership period is still running. A declared Austritt
// (cancelledByUser) keeps access until the end of that period (Art. 6 of the statutes) —
// the user can revoke it for free until then.
export function checkUserActiveMembership(
  status: UserMembershipStatus | undefined,
): boolean {
  if (!status) return false;
  return (
    !!status.lastPeriodEnd &&
    new Date(status.lastPeriodEnd as string) > new Date()
  );
}

// True if the paid period lapsed within the last GRACE_PERIOD_DAYS days. An explicit
// Austritt (cancelledByUser) gets no grace once the paid period is over.
export function checkUserGracePeriod(
  status: UserMembershipStatus | undefined,
): boolean {
  if (!status) return false;
  if (status.cancelledByUser) return false;
  if (!status.lastPeriodEnd) return false;
  if (checkUserActiveMembership(status)) return false; // still active, not in grace
  const graceCutoff = new Date(
    Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );
  return new Date(status.lastPeriodEnd as string) > graceCutoff;
}

// Combined access gate: an active paid membership, or within the post-expiry grace period.
export function checkUserHasAccess(
  status: UserMembershipStatus | undefined,
): boolean {
  return checkUserActiveMembership(status) || checkUserGracePeriod(status);
}

// True once the user has ever had a paid membership. Decides whether a lapsed user sees
// the returning-member view (status + payment history + renew) or the first-time paywall.
export function checkWasEverMember(
  status: UserMembershipStatus | undefined,
): boolean {
  return !!status?.lastPeriodEnd;
}
