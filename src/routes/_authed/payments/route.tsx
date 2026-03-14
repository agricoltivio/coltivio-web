import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { farmQueryOptions } from "@/api/farm.queries";
import { checkActiveMembership } from "@/lib/membership";
import { MembersOnly } from "@/components/MembersOnly";

export const Route = createFileRoute("/_authed/payments")({
  component: () => {
    const farm = useQuery(farmQueryOptions()).data;
    return checkActiveMembership(farm?.membership) ? <Outlet /> : <MembersOnly />;
  },
});
