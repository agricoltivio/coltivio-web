import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/animals/turnout-journal')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/animals/turnout-journal"!</div>
}
