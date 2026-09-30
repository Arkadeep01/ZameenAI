import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/field-officer/")({
  beforeLoad: () => {
    throw redirect({ to: "/field-officer/dashboard" });
  },
});
