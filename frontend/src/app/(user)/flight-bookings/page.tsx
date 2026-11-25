import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function FlightBookingsPage() {
  return (
    <RoutePlaceholder
      title="My flight bookings"
      owner="Adala"
      requirements={["FLT-25", "GEN-05", "GEN-04"]}
      description="Show upcoming, past and cancelled flight bookings with reference, flight, date, passengers, cabin and status."
    />
  );
}
