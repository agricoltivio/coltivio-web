import { Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { membershipStatusQueryOptions } from "@/api/membership.queries";
import { checkUserHasAccess } from "@/lib/membership";
import { MembersOnly } from "@/components/MembersOnly";

// Route component for the Treffpunkt community — the one feature that still requires a
// membership. The status is prefetched (awaited) in the _authed loader, so no flash.
export function MembersOnlyOutlet() {
  const status = useQuery(membershipStatusQueryOptions()).data;
  return checkUserHasAccess(status) ? <Outlet /> : <MembersOnly />;
}
