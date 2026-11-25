import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function AirlineFlightsPage() {
  return (
    <RoutePlaceholder
      title="Flights"
      owner="Malk"
      requirements={["FLT-03", "FLT-05", "FLT-06", "FLT-30", "GEN-05"]}
      description="List the airline's flights, create a flight, edit a Scheduled flight and cancel it after confirmation."
    />
  );
}
