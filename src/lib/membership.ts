import type { components } from "@/api/schema";

type FarmMembership =
  components["schemas"]["GetV1FarmPositiveResponse"]["data"]["membership"];

type UserMembershipStatus =
  components["schemas"]["GetV1MembershipStatusPositiveResponse"]["data"];

export const GRACE_PERIOD_DAYS = 10;

// Farm-level gate: true if any user in the farm has an active or trial membership
export function checkActiveMembership(
  membership: FarmMembership | undefined,
): boolean {
  return membership?.status === "active" || membership?.status === "trial";
}

// Farm-level trial check: true if the farm's only access is via a trial
export function checkIsTrialOnly(
  membership: FarmMembership | undefined,
): boolean {
  return membership?.status === "trial";
}

// User-level check: true if the user's own subscription or trial is active
export function checkUserActiveMembership(
  status: UserMembershipStatus | undefined,
): boolean {
  if (!status) return false;
  const now = new Date();
  const hasActivePeriod =
    !!status.lastPeriodEnd &&
    new Date(status.lastPeriodEnd as string) > now;
  const hasActiveTrial =
    !!status.trialEnd && new Date(status.trialEnd as string) > now;
  return hasActivePeriod || hasActiveTrial;
}

// User-level grace period check: true if membership expired within the last GRACE_PERIOD_DAYS days
export function checkUserGracePeriod(
  status: UserMembershipStatus | undefined,
): boolean {
  if (!status) return false;
  if (checkUserActiveMembership(status)) return false; // still active, not in grace
  const now = new Date();
  const graceCutoff = new Date(
    now.getTime() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
  );
  const periodExpiredInGrace =
    !!status.lastPeriodEnd &&
    new Date(status.lastPeriodEnd as string) > graceCutoff;
  const trialExpiredInGrace =
    !!status.trialEnd &&
    new Date(status.trialEnd as string) > graceCutoff;
  return periodExpiredInGrace || trialExpiredInGrace;
}
