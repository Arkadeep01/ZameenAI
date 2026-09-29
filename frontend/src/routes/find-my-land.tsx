import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/find-my-land")({
  beforeLoad: () => {
    throw redirect({ to: "/citizen/find-land" });
  },
});
