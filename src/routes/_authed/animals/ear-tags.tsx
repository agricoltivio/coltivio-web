import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/animals/ear-tags')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authed/animals/ear-tags"!</div>
}
