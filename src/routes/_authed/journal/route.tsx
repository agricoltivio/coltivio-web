import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { meQueryOptions } from "@/api/user.queries";

export const Route = createFileRoute("/_authed/journal")({
  beforeLoad: async ({ context: { queryClient } }) => {
    const me = await queryClient.ensureQueryData(meQueryOptions());
    if (me.farmRole !== "owner") {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: () => <Outlet />,
});
