import { createFileRoute } from "@tanstack/react-router";
import { ApproverDirectoryPage } from "../features/approver/ApproverDirectoryPage";

export const Route = createFileRoute("/approver/contested")({
  component: () => <ApproverDirectoryPage variant="contested" />,
});
