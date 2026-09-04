import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/citizen/dashboard')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/citizen/dashboard"!</div>
}
