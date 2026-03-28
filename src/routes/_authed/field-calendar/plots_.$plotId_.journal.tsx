import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useMembership } from "@/lib/useMembership";
import { MembersOnly } from "@/components/MembersOnly";

export const Route = createFileRoute(
  "/_authed/field-calendar/plots_/$plotId_/journal",
)({
  component: () => {
    const { hasAccess } = useMembership();
    return hasAccess ? <Outlet /> : <MembersOnly />;
  },
});
