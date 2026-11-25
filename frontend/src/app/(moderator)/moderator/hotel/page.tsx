import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function HotelDashboardPage() {
  return (
    <RoutePlaceholder
      title="Hotel dashboard"
      owner="Hana"
      requirements={["HTL-01", "HTL-03"]}
      description="Overview of the assigned hotel: profile completeness, rooms and availability."
    />
  );
}
