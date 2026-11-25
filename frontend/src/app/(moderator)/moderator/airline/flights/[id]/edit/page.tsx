import { RoutePlaceholder } from "@/components/layout/RoutePlaceholder";

export default function EditFlightPage() {
  return (
    <RoutePlaceholder
      title="Edit flight"
      owner="Malk"
      requirements={["FLT-05", "FLT-04", "GEN-01"]}
      description="Edit times, cabin prices and seat counts of a Scheduled flight. Show the restrictions on airports and booked seats."
    />
  );
}
