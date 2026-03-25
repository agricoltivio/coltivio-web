import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/orders/invoice-settings")({
  component: () => <Outlet />,
});
