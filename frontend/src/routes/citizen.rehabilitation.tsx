import { createFileRoute } from "@tanstack/react-router";
import ComingSoonPage from "../components/common/ComingSoonPage";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

export const Route = createFileRoute("/citizen/rehabilitation")({
  component: RehabilitationPage,
});

function RehabilitationPage() {
  return (
    <ComingSoonPage
      title="Rehabilitation & R&R"
      description="Rehabilitation and Resettlement services will be available soon."
      breadcrumbs={citizenCrumbs("/citizen/rehabilitation")}
    />
  );
}

export default RehabilitationPage;
