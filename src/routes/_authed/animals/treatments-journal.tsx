import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/animals/treatments-journal')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/animals/treatments-journal"!</div>
}
