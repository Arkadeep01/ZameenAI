import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/citizen/land-acquisition")({
  beforeLoad: () => {
    throw redirect({ to: "/citizen/acquisition" });
  },
});
