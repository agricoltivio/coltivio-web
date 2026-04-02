import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/treffpunkt")({
  component: () => <Outlet />,
});
