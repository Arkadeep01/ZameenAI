import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/executive/")({
  beforeLoad: () => {
    throw redirect({ to: "/executive/dashboard" });
  },
});
