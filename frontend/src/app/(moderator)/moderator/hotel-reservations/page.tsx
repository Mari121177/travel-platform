import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function HotelReservationsPage() {
  return (
    <RoutePlaceholder
      title="Hotel reservations"
      owner="Maya"
      requirements={["HTL-22", "GEN-05"]}
      description="Show the reservations for the assigned hotel with guest, dates and status."
    />
  );
}
