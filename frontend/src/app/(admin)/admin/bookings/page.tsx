import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function AdminBookingsPage() {
  return (
    <RoutePlaceholder
      title="All bookings"
      owner="Ghada"
      requirements={["ACC-17", "GEN-05"]}
      description="Show every flight and hotel booking read-only, filterable by type, status and date range, with pagination."
    />
  );
}
