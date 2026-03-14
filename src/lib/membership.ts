import type { components } from "@/api/schema";

type FarmMembership =
  components["schemas"]["GetV1FarmPositiveResponse"]["data"]["membership"];

export function checkActiveMembership(
  membership: FarmMembership | undefined,
): boolean {
  if (!membership) return false;
  const now = new Date();
  const hasActivePeriod =
    !!membership.lastPeriodEnd &&
    new Date(membership.lastPeriodEnd as string) > now;
  const hasActiveTrial =
    !!membership.trialEnd && new Date(membership.trialEnd as string) > now;
  return hasActivePeriod || hasActiveTrial;
}
