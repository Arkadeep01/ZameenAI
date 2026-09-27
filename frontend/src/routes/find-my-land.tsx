import { createFileRoute } from "@tanstack/react-router";
import FindMyLand from "../components/gis/FindMyLand";

type FindMyLandSearch = {
  q?: string;
};

export const Route = createFileRoute("/find-my-land")({
  validateSearch: (search: Record<string, unknown>): FindMyLandSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  component: FindMyLandRoute,
});

function FindMyLandRoute() {
  const { q } = Route.useSearch();
  return <FindMyLand initialQuery={q} />;
}
