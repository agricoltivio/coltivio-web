import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { membershipStatusQueryOptions, membershipPaymentsQueryOptions } from "@/api/membership.queries";
import { MembershipContent } from "@/components/MembershipContent";

export const Route = createFileRoute("/_authed/membership/")({
  validateSearch: z.object({ membership: z.string().optional() }),
  loader: ({ context: { queryClient } }) => {
    queryClient.ensureQueryData(membershipStatusQueryOptions());
    queryClient.ensureQueryData(membershipPaymentsQueryOptions());
  },
  component: MembershipPage,
});

function MembershipPage() {
  const { membership: membershipSuccess } = Route.useSearch();
  return <MembershipContent membershipSuccess={membershipSuccess} />;
}
