import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function NewFlightPage() {
  return (
    <RoutePlaceholder
      title="Create flight"
      owner="Malk"
      requirements={["FLT-02", "FLT-03", "FLT-04"]}
      description="Create a flight with airports, local departure and arrival times, and at least one cabin category."
    />
  );
}
