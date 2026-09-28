import { createFileRoute } from "@tanstack/react-router";
import MyLandAcquisitionPage from "./citizen.my-land-acquisition";

export const Route = createFileRoute("/citizen/acquisition")({
  component: MyLandAcquisitionPage,
});

export default MyLandAcquisitionPage;
