import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { farmQueryOptions } from "@/api/farm.queries";
import { membershipStatusQueryOptions } from "@/api/membership.queries";
import { meQueryOptions } from "@/api/user.queries";
import { checkActiveMembership, checkUserActiveMembership } from "@/lib/membership";
import { MembersOnly } from "@/components/MembersOnly";

export const Route = createFileRoute("/_authed/treffpunkt")({
  component: () => {
    const meQuery = useQuery(meQueryOptions());
    const farm = useQuery(farmQueryOptions(meQuery.data?.farmId != null)).data;
    const statusQuery = useQuery(membershipStatusQueryOptions());
    const hasAccess =
      checkActiveMembership(farm?.membership) ||
      checkUserActiveMembership(statusQuery.data);
    return hasAccess ? <Outlet /> : <MembersOnly />;
  },
});
