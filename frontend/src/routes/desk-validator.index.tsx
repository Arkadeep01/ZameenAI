import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/desk-validator/")({
  beforeLoad: () => {
    throw redirect({ to: "/desk-validator/dashboard" });
  },
});
