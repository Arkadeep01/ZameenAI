import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/approver/")({
  beforeLoad: () => {
    throw redirect({ to: "/approver/dashboard" });
  },
});
