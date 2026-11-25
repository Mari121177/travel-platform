import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function HotelAvailabilityPage() {
  return (
    <RoutePlaceholder
      title="Availability"
      owner="Hana"
      requirements={["HTL-04", "HTL-06", "HTL-08"]}
      description="Define bookable date ranges, block ranges, and view each room's status calendar for a date range."
    />
  );
}
