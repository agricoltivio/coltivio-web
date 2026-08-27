import { createFileRoute } from "@tanstack/react-router";
import { MembersOnlyOutlet } from "@/components/MembersOnlyOutlet";

export const Route = createFileRoute("/_authed/treffpunkt")({
  component: MembersOnlyOutlet,
});
