import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function FlightDetailsModeratorPage() {
  return (
    <RoutePlaceholder
      title="Flight details"
      owner="Malk"
      requirements={["FLT-04", "FLT-05", "FLT-30"]}
      description="Show the flight, its cabins, seat counts, prices and status."
    />
  );
}
