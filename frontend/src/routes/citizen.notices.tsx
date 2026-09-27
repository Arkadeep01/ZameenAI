import { createFileRoute } from "@tanstack/react-router";
import ComingSoonPage from "../components/common/ComingSoonPage";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

export const Route = createFileRoute("/citizen/notices")({
  component: NoticesPage,
});

function NoticesPage() {
  return (
    <ComingSoonPage
      title="Notices"
      description="Gazette notifications, section 11(1) preliminary notices and public circulars issued by the department will be listed here."
      breadcrumbs={citizenCrumbs("/citizen/notices")}
    />
  );
}

export default NoticesPage;
