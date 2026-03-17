import type { components } from "@/api/schema";

type FarmMembership =
  components["schemas"]["GetV1FarmPositiveResponse"]["data"]["membership"];

type UserMembershipStatus =
  components["schemas"]["GetV1MembershipStatusPositiveResponse"]["data"];

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
