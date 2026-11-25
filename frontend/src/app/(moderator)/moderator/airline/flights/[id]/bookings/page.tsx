import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function FlightBookingsModeratorPage() {
  return (
    <RoutePlaceholder
      title="Flight bookings"
      owner="Malk"
      requirements={["FLT-29", "GEN-05"]}
      description="Show the bookings for this flight, seats remaining per cabin, and the passenger list with CSV export."
    />
  );
}
