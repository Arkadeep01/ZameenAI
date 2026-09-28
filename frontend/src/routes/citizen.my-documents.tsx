import { createFileRoute } from "@tanstack/react-router";
import MyDocumentsPage from "./citizen.documents";

export const Route = createFileRoute("/citizen/my-documents")({
  component: MyDocumentsPage,
});

export default MyDocumentsPage;
