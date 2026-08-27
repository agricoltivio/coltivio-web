import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authed/field-calendar/plots_/$plotId_/journal",
)({
  component: () => <Outlet />,
});
