import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function FlightDetailsPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <RoutePlaceholder
        title="Flight details"
        owner="Ghada"
        requirements={["FLT-17", "GEN-06"]}
        description="Show airline, flight number, airports, local times, duration, cabins, baggage and the cancellation policy."
      />
    </div>
  );
}
