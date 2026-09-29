import { createFileRoute } from "@tanstack/react-router";
import ComingSoonPage from "../components/common/ComingSoonPage";
import { citizenCrumbs } from "../config/citizenBreadcrumbs";

export const Route = createFileRoute("/citizen/documents")({
  component: MyDocumentsPage,
});

function MyDocumentsPage() {
  return (
    <ComingSoonPage
      title="My Documents"
      description="Your digitised land records, certificates and gazette notifications will be listed here once the document service is enabled."
      breadcrumbs={citizenCrumbs("/citizen/documents")}
    />
  );
}

export default MyDocumentsPage;
