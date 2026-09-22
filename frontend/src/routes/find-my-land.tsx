import { createFileRoute } from "@tanstack/react-router";
import FindMyLand from "../components/gis/FindMyLand";

export const Route = createFileRoute("/find-my-land")({
  component: FindMyLand,
});
