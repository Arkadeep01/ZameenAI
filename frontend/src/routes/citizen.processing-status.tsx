import { createFileRoute } from "@tanstack/react-router";
import ProcessingQueue from "../components/citizen/ProcessingQueue";

export const Route = createFileRoute("/citizen/processing-status")({
  component: ProcessingQueue,
});
