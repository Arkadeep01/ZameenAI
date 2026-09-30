import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pia/")({
  beforeLoad: () => {
    throw redirect({ to: "/pia/dashboard" });
  },
});
