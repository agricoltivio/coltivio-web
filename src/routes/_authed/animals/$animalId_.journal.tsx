import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useMembership } from "@/lib/useMembership";
import { MembersOnly } from "@/components/MembersOnly";

export const Route = createFileRoute("/_authed/animals/$animalId_/journal")({
  component: () => {
    const { hasAccess } = useMembership();
    return hasAccess ? <Outlet /> : <MembersOnly />;
  },
});
