import { createFileRoute } from "@tanstack/react-router";
import ComingSoonPage from "../components/common/ComingSoonPage";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

export const Route = createFileRoute("/citizen/activity")({
  component: ActivityPage,
});

function ActivityPage() {
  return (
    <ComingSoonPage
      title="Activity"
      description="A permanent, filterable log of your portal actions and revenue department updates will be available here."
      breadcrumbs={citizenCrumbs("/citizen/activity")}
    />
  );
}

export default ActivityPage;
