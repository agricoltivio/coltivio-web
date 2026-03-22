import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { farmQueryOptions } from "@/api/farm.queries";
import { membershipStatusQueryOptions } from "@/api/membership.queries";
import { checkActiveMembership, checkUserGracePeriod } from "@/lib/membership";
import { MembersOnly } from "@/components/MembersOnly";

export const Route = createFileRoute("/_authed/sponsorships")({
  component: () => {
    const farm = useQuery(farmQueryOptions()).data;
    const userStatus = useQuery(membershipStatusQueryOptions()).data;
    const hasAccess =
      checkActiveMembership(farm?.membership) ||
      checkUserGracePeriod(userStatus);
    return hasAccess ? <Outlet /> : <MembersOnly />;
  },
});
