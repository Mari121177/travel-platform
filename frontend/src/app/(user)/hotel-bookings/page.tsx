import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function HotelBookingsPage() {
  return (
    <RoutePlaceholder
      title="My hotel reservations"
      owner="Maya"
      requirements={["HTL-20", "GEN-05", "GEN-04"]}
      description="Show upcoming, past and cancelled hotel reservations with reference, hotel, rooms, dates, guests, total and status."
    />
  );
}
