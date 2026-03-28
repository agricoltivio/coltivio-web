import { useQuery } from "@tanstack/react-query";
import { farmQueryOptions } from "@/api/farm.queries";
import { membershipStatusQueryOptions } from "@/api/membership.queries";
import { meQueryOptions } from "@/api/user.queries";
import {
  checkActiveMembership,
  checkUserActiveMembership,
  checkUserGracePeriod,
} from "@/lib/membership";

export function useMembership() {
  const meQuery = useQuery(meQueryOptions());
  const farmQuery = useQuery(farmQueryOptions(meQuery.data?.farmId != null));
  const statusQuery = useQuery(membershipStatusQueryOptions());

  const hasAccess =
    checkActiveMembership(farmQuery.data?.membership) ||
    checkUserActiveMembership(statusQuery.data) ||
    checkUserGracePeriod(statusQuery.data);

  return { hasAccess };
}
